import { Hono, type Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { validator } from 'hono/validator'
import { createLogger, TERMS_VERSION } from 'utils'

import type { AuthGuard, AuthenticatedUser } from './repository/auth-guard.interface.ts'
import { SESSION_COOKIE } from './repository/auth-guard.session.ts'
import { AppError, type AppErrorCode } from './service/app-error.ts'
import type { AuthService, LoginResult } from './service/auth.service.ts'
import type { MemoInput, NoteService } from './service/note.service.ts'

export interface AuthConfig {
  guard: AuthGuard
  /** Off by default (free access). When on, applies to every route except `excludePaths`. */
  enabled: boolean
  excludePaths: string[]
}

export interface AppDependencies {
  authService: AuthService
  noteService: NoteService
  auth: AuthConfig
  /**
   * Development login (`POST /api/auth/dev`, sign-in without Google). Off unless the runtime
   * package turns it on explicitly for local development; never on in production.
   */
  devLogin?: boolean
}

/** Paths reachable without a session: signing in and out. */
export const PUBLIC_PATHS = ['/api/auth/google', '/api/auth/dev', '/api/auth/logout']

/** Paths usable before agreeing to revised terms: everything else answers `terms_not_agreed`. */
const PATHS_BEFORE_TERMS = ['/api/me', '/api/me/terms']

type Env = { Variables: { user: AuthenticatedUser | null; requestId: string } }

const STATUS: Record<AppErrorCode, 400 | 401 | 403 | 404 | 409> = {
  validation: 400,
  unauthorized: 401,
  terms_not_agreed: 403,
  not_found: 404,
  limit_exceeded: 409,
}

const COOKIE_OPTIONS = { path: '/api', httpOnly: true, secure: true, sameSite: 'Lax' } as const

// 4 random bytes as hex: short enough to scan by eye in logs, still ~4 billion values so
// collisions within one log stream are practically a non-issue.
const generateRequestId = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(4)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')

const userIdOf = (c: Context<Env>) => {
  const user = c.get('user')
  if (!user) throw new AppError('unauthorized')
  return user.id
}

// Request bodies: the validator checks the shape (its return type is the RPC client's input
// type); the service decides on the content (empty names, limits, ...).
const invalid = () => new AppError('validation', 'リクエストの形式が正しくありません')
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isString = (v: unknown): v is string => typeof v === 'string'
const isStringOrNull = (v: unknown): v is string | null => v === null || typeof v === 'string'
const isIds = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString)

const loginBody = validator('json', (v): { idToken: string; termsVersion: string | null } => {
  if (!isRecord(v) || !isString(v.idToken) || !isStringOrNull(v.termsVersion)) throw invalid()
  return { idToken: v.idToken, termsVersion: v.termsVersion }
})
const devLoginBody = validator('json', (v): { name: string; termsVersion: string | null } => {
  if (!isRecord(v) || !isString(v.name) || !v.name || !isStringOrNull(v.termsVersion)) {
    throw invalid()
  }
  return { name: v.name, termsVersion: v.termsVersion }
})
const termsBody = validator('json', (v): { termsVersion: string } => {
  if (!isRecord(v) || !isString(v.termsVersion)) throw invalid()
  return { termsVersion: v.termsVersion }
})
const nameBody = validator('json', (v): { name: string } => {
  if (!isRecord(v) || !isString(v.name)) throw invalid()
  return { name: v.name }
})
const memoBody = validator('json', (v): MemoInput => {
  if (!isRecord(v) || !isStringOrNull(v.keyword) || !isString(v.body)) throw invalid()
  return { keyword: v.keyword, body: v.body }
})
const idsBody = validator('json', (v): { ids: string[] } => {
  if (!isRecord(v) || !isIds(v.ids)) throw invalid()
  return { ids: v.ids }
})
const syncQuery = validator('query', (v): { since?: string } => {
  const since = v.since
  if (since === undefined) return {}
  if (!isString(since) || !/^\d{1,15}$/.test(since)) throw invalid()
  return { since }
})

/** Runtime-agnostic app: no Cloudflare Workers or Node-specific APIs here. Entrypoints live in the runtime package (`apps/backend-*`). */
export const createApp = (deps: AppDependencies) => {
  const logger = createLogger({ format: 'json' })
  const { authService, noteService } = deps

  const startSession = (c: Context<Env>, { me, token }: LoginResult) => {
    // A session cookie: the session's lifetime is enforced on the server (`sessions.expires_at`)
    setCookie(c, SESSION_COOKIE, token, COOKIE_OPTIONS)
    return c.json(me)
  }

  // Served under /api on the same origin as the frontend (Vite proxies it in dev), so no CORS.
  const app = new Hono<Env>().basePath('/api')

  // Every error answers `{ code, message }`, the shape the client turns into an `ApiError`.
  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ code: err.code, message: err.message }, STATUS[err.code])
    }
    if (err instanceof HTTPException && err.status === 400) {
      return c.json({ code: 'validation', message: err.message }, 400)
    }
    logger.error('unhandled error', {
      requestId: c.get('requestId'),
      error: err instanceof Error ? err.message : String(err),
    })
    return c.json({ code: 'unknown', message: 'Internal Server Error' }, 500)
  })
  app.notFound((c) => c.json({ code: 'not_found', message: 'Not Found' }, 404))

  return (
    app
      // Audit trail: start/end pair per request, joined by requestId (needed since concurrent
      // requests to the same method+path would otherwise be indistinguishable in the log stream).
      // Wraps the auth guard so a rejected (401) request is still logged, not just successful ones.
      .use('*', async (c, next) => {
        const requestId = generateRequestId()
        c.set('requestId', requestId)
        const startedAt = Date.now()

        logger.info('request started', { requestId, method: c.req.method, path: c.req.path })

        try {
          await next()
        } finally {
          logger.info('request completed', {
            requestId,
            method: c.req.method,
            path: c.req.path,
            user: c.get('user')?.id ?? 'anonymous',
            status: c.res.status,
            durationMs: Date.now() - startedAt,
          })
        }
      })
      .use('*', async (c, next) => {
        if (deps.auth.enabled && !deps.auth.excludePaths.includes(c.req.path)) {
          const user = await deps.auth.guard.authenticate(c.req.raw)
          if (!user) throw new AppError('unauthorized')
          c.set('user', user)
          // Revised terms are agreed to before using the app ("総論 > 共通ルール > 同意")
          if (user.termsVersion !== TERMS_VERSION && !PATHS_BEFORE_TERMS.includes(c.req.path)) {
            throw new AppError('terms_not_agreed')
          }
        } else {
          c.set('user', null)
        }
        await next()
      })

      // Auth
      .post('/auth/google', loginBody, async (c) => {
        const { idToken, termsVersion } = c.req.valid('json')
        return startSession(c, await authService.loginWithGoogle(idToken, termsVersion))
      })
      .post('/auth/dev', devLoginBody, async (c) => {
        if (!deps.devLogin) throw new AppError('not_found')
        const { name, termsVersion } = c.req.valid('json')
        return startSession(c, await authService.loginForDevelopment(name, termsVersion))
      })
      .post('/auth/logout', async (c) => {
        const token = getCookie(c, SESSION_COOKIE)
        if (token) await authService.logout(token)
        deleteCookie(c, SESSION_COOKIE, COOKIE_OPTIONS)
        return c.body(null, 204)
      })

      // The signed-in user
      .get('/me', async (c) => c.json(await authService.me(userIdOf(c))))
      .post('/me/terms', termsBody, async (c) =>
        c.json(await authService.agreeTerms(userIdOf(c), c.req.valid('json').termsVersion)),
      )
      .delete('/me', async (c) => {
        await authService.withdraw(userIdOf(c))
        deleteCookie(c, SESSION_COOKIE, COOKIE_OPTIONS)
        return c.body(null, 204)
      })

      // Categories and memos
      .get('/sync', syncQuery, async (c) => {
        const { since } = c.req.valid('query')
        return c.json(
          await noteService.sync(userIdOf(c), since === undefined ? null : Number(since)),
        )
      })
      .post('/categories', nameBody, async (c) =>
        c.json(await noteService.createCategory(userIdOf(c), c.req.valid('json').name)),
      )
      .put('/categories/order', idsBody, async (c) =>
        c.json(await noteService.reorderCategories(userIdOf(c), c.req.valid('json').ids)),
      )
      .patch('/categories/:id', nameBody, async (c) =>
        c.json(
          await noteService.renameCategory(
            userIdOf(c),
            c.req.param('id'),
            c.req.valid('json').name,
          ),
        ),
      )
      .delete('/categories/:id', async (c) =>
        c.json(await noteService.deleteCategory(userIdOf(c), c.req.param('id'))),
      )
      .post('/categories/:id/memos', memoBody, async (c) =>
        c.json(await noteService.createMemo(userIdOf(c), c.req.param('id'), c.req.valid('json'))),
      )
      .put('/categories/:id/memos/order', idsBody, async (c) =>
        c.json(
          await noteService.reorderMemos(userIdOf(c), c.req.param('id'), c.req.valid('json').ids),
        ),
      )
      .patch('/memos/:id', memoBody, async (c) =>
        c.json(await noteService.updateMemo(userIdOf(c), c.req.param('id'), c.req.valid('json'))),
      )
      .delete('/memos/:id', async (c) =>
        c.json(await noteService.deleteMemo(userIdOf(c), c.req.param('id'))),
      )
  )
}

/** Hono RPC contract consumed by `apps/frontend` via `hc<AppType>()`. */
export type AppType = ReturnType<typeof createApp>
