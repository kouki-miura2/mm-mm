import { LIMITS, TERMS_VERSION } from 'utils'

import type { AuthenticatedUser } from '../repository/auth-guard.interface.ts'
import type { IdTokenVerifier } from '../repository/id-token.google.ts'
import type { User, UserRepository } from '../repository/user.repository.ts'
import { AppError } from './app-error.ts'

export interface Me {
  userId: string
  /** Version of the terms of service and privacy policy the user agreed to. */
  termsVersion: string
  termsAgreedAt: number
}

export interface LoginResult {
  me: Me
  /** Session token for the cookie. Only its hash is stored. */
  token: string
}

export interface AuthService {
  /** Signs in with a Google ID token. A new user is registered only with `termsVersion`. */
  loginWithGoogle: (idToken: string, termsVersion: string | null) => Promise<LoginResult>
  /** Development login: signs in as `dev:<name>` without Google. Enabled by the runtime only. */
  loginForDevelopment: (name: string, termsVersion: string | null) => Promise<LoginResult>
  /** The session's user, or `null` when it's unknown or expired. Extends the session. */
  authenticate: (token: string) => Promise<AuthenticatedUser | null>
  logout: (token: string) => Promise<void>
  me: (userId: string) => Promise<Me>
  agreeTerms: (userId: string, termsVersion: string) => Promise<Me>
  /** Hard-deletes the user and all of their data. */
  withdraw: (userId: string) => Promise<void>
  purgeExpiredSessions: () => Promise<void>
}

const sessionTtlMs = LIMITS.sessionTtlHours * 60 * 60 * 1000

const toMe = (user: User): Me => ({
  userId: user.id,
  termsVersion: user.termsVersion,
  termsAgreedAt: user.termsAgreedAt,
})

const newToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

const hashToken = async (token: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export const createAuthService = (
  users: UserRepository,
  verifier: IdTokenVerifier,
): AuthService => {
  const login = async (googleSub: string, termsVersion: string | null): Promise<LoginResult> => {
    const now = Date.now()
    const agreed = termsVersion === TERMS_VERSION
    let user = await users.findByGoogleSub(googleSub)
    if (!user) {
      // Registered only after consent ("総論 > 共通ルール > 同意")
      if (!agreed) throw new AppError('terms_not_agreed')
      user = {
        id: crypto.randomUUID(),
        googleSub,
        termsVersion: TERMS_VERSION,
        termsAgreedAt: now,
        createdAt: now,
      }
      await users.create(user)
    } else if (agreed && user.termsVersion !== TERMS_VERSION) {
      // Agreed to the revised terms on this device right before signing in
      await users.updateTerms(user.id, TERMS_VERSION, now)
      user = { ...user, termsVersion: TERMS_VERSION, termsAgreedAt: now }
    }
    const token = newToken()
    await users.createSession({
      tokenHash: await hashToken(token),
      userId: user.id,
      expiresAt: now + sessionTtlMs,
      createdAt: now,
    })
    return { me: toMe(user), token }
  }

  const me = async (userId: string) => {
    const user = await users.findById(userId)
    if (!user) throw new AppError('unauthorized')
    return toMe(user)
  }

  return {
    loginWithGoogle: async (idToken, termsVersion) => {
      const sub = await verifier.verify(idToken)
      if (!sub) throw new AppError('unauthorized')
      return login(sub, termsVersion)
    },

    loginForDevelopment: (name, termsVersion) => login(`dev:${name}`, termsVersion),

    authenticate: async (token) => {
      const tokenHash = await hashToken(token)
      const session = await users.findSession(tokenHash)
      const now = Date.now()
      if (!session || session.expiresAt <= now) return null
      // Sliding expiry, written only once half the lifetime has passed to save D1 writes
      if (session.expiresAt - now < sessionTtlMs / 2) {
        await users.extendSession(tokenHash, now + sessionTtlMs)
      }
      return { id: session.userId, termsVersion: session.termsVersion }
    },

    logout: async (token) => users.deleteSession(await hashToken(token)),

    me,

    agreeTerms: async (userId, termsVersion) => {
      if (termsVersion !== TERMS_VERSION) {
        throw new AppError('validation', '利用規約の版が最新ではありません')
      }
      await users.updateTerms(userId, termsVersion, Date.now())
      return me(userId)
    },

    withdraw: (userId) => users.deleteWithData(userId),

    purgeExpiredSessions: () => users.deleteExpiredSessions(Date.now()),
  }
}
