import type { SessionDao } from '../dao/session.interface.ts'
import type { UserDao, UserRecord } from '../dao/user.interface.ts'

export interface User {
  id: string
  googleSub: string
  termsVersion: string
  termsAgreedAt: number
  createdAt: number
}

export interface Session {
  tokenHash: string
  userId: string
  expiresAt: number
  createdAt: number
}

/** What each authenticated request needs: the session and the terms version its user agreed to. */
export interface SessionUser {
  userId: string
  expiresAt: number
  termsVersion: string
}

export interface UserRepository {
  findById: (id: string) => Promise<User | null>
  findByGoogleSub: (googleSub: string) => Promise<User | null>
  create: (user: User) => Promise<void>
  updateTerms: (id: string, termsVersion: string, agreedAt: number) => Promise<void>
  deleteWithData: (id: string) => Promise<void>
  createSession: (session: Session) => Promise<void>
  findSession: (tokenHash: string) => Promise<SessionUser | null>
  extendSession: (tokenHash: string, expiresAt: number) => Promise<void>
  deleteSession: (tokenHash: string) => Promise<void>
  deleteExpiredSessions: (now: number) => Promise<void>
}

const toUser = (r: UserRecord): User => ({
  id: r.id,
  googleSub: r.google_sub,
  termsVersion: r.terms_version,
  termsAgreedAt: r.terms_agreed_at,
  createdAt: r.created_at,
})

/** Users and their sessions: a session only means something together with its user. */
export const createUserRepository = (userDao: UserDao, sessionDao: SessionDao): UserRepository => ({
  findById: async (id) => {
    const record = await userDao.findById(id)
    return record && toUser(record)
  },
  findByGoogleSub: async (sub) => {
    const record = await userDao.findByGoogleSub(sub)
    return record && toUser(record)
  },
  create: (u) =>
    userDao.insert({
      id: u.id,
      google_sub: u.googleSub,
      terms_version: u.termsVersion,
      terms_agreed_at: u.termsAgreedAt,
      created_at: u.createdAt,
    }),
  updateTerms: (id, version, at) => userDao.updateTerms(id, version, at),
  deleteWithData: (id) => userDao.deleteWithData(id),
  createSession: (s) =>
    sessionDao.insert({
      token_hash: s.tokenHash,
      user_id: s.userId,
      expires_at: s.expiresAt,
      created_at: s.createdAt,
    }),
  findSession: async (hash) => {
    const record = await sessionDao.findWithUser(hash)
    return (
      record && {
        userId: record.user_id,
        expiresAt: record.expires_at,
        termsVersion: record.terms_version,
      }
    )
  },
  extendSession: (hash, expiresAt) => sessionDao.updateExpiry(hash, expiresAt),
  deleteSession: (hash) => sessionDao.delete(hash),
  deleteExpiredSessions: (now) => sessionDao.deleteExpired(now),
})
