import { TERMS_VERSION } from 'utils'
import { expect, test, vi } from 'vite-plus/test'

import { createApp, PUBLIC_PATHS, type AppDependencies } from './app.ts'
import type { AuthGuard } from './repository/auth-guard.interface.ts'
import { SESSION_COOKIE } from './repository/auth-guard.session.ts'
import { AppError } from './service/app-error.ts'
import type { AuthService } from './service/auth.service.ts'
import type { NoteService } from './service/note.service.ts'

const me = { userId: 'u1', termsVersion: TERMS_VERSION, termsAgreedAt: 1 }
const empty = { categories: [], memos: [] }

const authService: AuthService = {
  loginWithGoogle: async (idToken, termsVersion) => {
    if (idToken !== 'good') throw new AppError('unauthorized')
    if (!termsVersion) throw new AppError('terms_not_agreed')
    return { me, token: 'tok' }
  },
  loginForDevelopment: async () => ({ me, token: 'dev-tok' }),
  authenticate: async () => null,
  logout: vi.fn(async () => {}),
  me: async () => me,
  agreeTerms: async () => me,
  withdraw: vi.fn(async () => {}),
  purgeExpiredSessions: async () => {},
}
const noteService: NoteService = {
  sync: vi.fn(async (_userId, since) => ({ full: since === null, ...empty, syncedAt: 5 })),
  createCategory: async (_userId, name) => {
    if (name === 'full') throw new AppError('limit_exceeded')
    return empty
  },
  renameCategory: async () => {
    throw new AppError('not_found')
  },
  deleteCategory: async () => empty,
  reorderCategories: vi.fn(async () => empty),
  createMemo: vi.fn(async () => empty),
  updateMemo: async () => empty,
  deleteMemo: async () => empty,
  reorderMemos: async () => empty,
  purgeDeleted: async () => {},
}
const signedIn: AuthGuard = {
  authenticate: async () => ({ id: 'u1', termsVersion: TERMS_VERSION }),
}
const oldTerms: AuthGuard = { authenticate: async () => ({ id: 'u1', termsVersion: 'old' }) }
const signedOut: AuthGuard = { authenticate: async () => null }

const setup = (guard: AuthGuard = signedIn, over: Partial<AppDependencies> = {}) =>
  createApp({
    authService,
    noteService,
    auth: { guard, enabled: true, excludePaths: PUBLIC_PATHS },
    ...over,
  })

const json = (method: string, body: unknown, headers: Record<string, string> = {}) => ({
  method,
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
})

test('sign-in sets an HttpOnly session cookie', async () => {
  const res = await setup(signedOut).request(
    '/api/auth/google',
    json('POST', { idToken: 'good', termsVersion: TERMS_VERSION }),
  )

  expect(await res.json()).toEqual(me)
  const cookie = res.headers.get('set-cookie')!
  expect(cookie).toContain(`${SESSION_COOKIE}=tok`)
  expect(cookie).toMatch(/HttpOnly/i)
  expect(cookie).toMatch(/Secure/i)
  expect(cookie).toMatch(/SameSite=Lax/i)
})

test('sign-in errors answer { code, message } with their status', async () => {
  const app = setup(signedOut)

  const forged = await app.request(
    '/api/auth/google',
    json('POST', { idToken: 'bad', termsVersion: null }),
  )
  expect(forged.status).toBe(401)
  expect(await forged.json()).toMatchObject({ code: 'unauthorized' })

  const noTerms = await app.request(
    '/api/auth/google',
    json('POST', { idToken: 'good', termsVersion: null }),
  )
  expect(noTerms.status).toBe(403)
  expect(await noTerms.json()).toMatchObject({ code: 'terms_not_agreed' })

  const malformed = await app.request('/api/auth/google', json('POST', { idToken: 1 }))
  expect(malformed.status).toBe(400)
  expect(await malformed.json()).toMatchObject({ code: 'validation' })
})

test('development login exists only when the runtime enables it', async () => {
  const body = json('POST', { name: 'dev', termsVersion: TERMS_VERSION })

  expect((await setup(signedOut).request('/api/auth/dev', body)).status).toBe(404)
  expect((await setup(signedOut, { devLogin: true }).request('/api/auth/dev', body)).status).toBe(
    200,
  )
})

test('logout deletes the session and clears the cookie', async () => {
  const res = await setup(signedOut).request('/api/auth/logout', {
    method: 'POST',
    headers: { cookie: `${SESSION_COOKIE}=tok` },
  })

  expect(res.status).toBe(204)
  expect(authService.logout).toHaveBeenCalledWith('tok')
  expect(res.headers.get('set-cookie')).toMatch(/Max-Age=0/i)
})

test('requires a session outside the public paths', async () => {
  const res = await setup(signedOut).request('/api/me')

  expect(res.status).toBe(401)
  expect(await res.json()).toMatchObject({ code: 'unauthorized' })
})

test('with outdated terms only /me and /me/terms are usable', async () => {
  const app = setup(oldTerms)

  expect((await app.request('/api/me')).status).toBe(200)
  expect(
    (await app.request('/api/me/terms', json('POST', { termsVersion: TERMS_VERSION }))).status,
  ).toBe(200)
  const sync = await app.request('/api/sync')
  expect(sync.status).toBe(403)
  expect(await sync.json()).toMatchObject({ code: 'terms_not_agreed' })
})

test('sync passes since as a number, or null when omitted', async () => {
  const app = setup()

  expect(await (await app.request('/api/sync')).json()).toMatchObject({ full: true })
  await app.request('/api/sync?since=123')
  expect(noteService.sync).toHaveBeenLastCalledWith('u1', 123)
  expect((await app.request('/api/sync?since=abc')).status).toBe(400)
})

test('writes call the service with the signed-in user', async () => {
  const app = setup()

  await app.request('/api/categories/order', json('PUT', { ids: ['a', 'b'] }))
  expect(noteService.reorderCategories).toHaveBeenCalledWith('u1', ['a', 'b'])

  await app.request('/api/categories/c1/memos', json('POST', { keyword: null, body: 'b' }))
  expect(noteService.createMemo).toHaveBeenCalledWith('u1', 'c1', { keyword: null, body: 'b' })
})

test('maps service errors to statuses', async () => {
  const app = setup()

  expect((await app.request('/api/categories', json('POST', { name: 'full' }))).status).toBe(409)
  expect((await app.request('/api/categories/x', json('PATCH', { name: 'n' }))).status).toBe(404)
  expect((await app.request('/api/categories', json('POST', { name: 1 }))).status).toBe(400)
  expect((await app.request('/api/unknown')).status).toBe(404)
})

test('withdrawal deletes the user and clears the cookie', async () => {
  const res = await setup().request('/api/me', { method: 'DELETE' })

  expect(res.status).toBe(204)
  expect(authService.withdraw).toHaveBeenCalledWith('u1')
  expect(res.headers.get('set-cookie')).toMatch(/Max-Age=0/i)
})

test('logs a matching started/completed pair, including for a rejected request', async () => {
  const info = vi.spyOn(console, 'info').mockImplementation(() => {})
  const app = setup(signedOut)

  const res = await app.request('/api/me')
  expect(res.status).toBe(401)

  expect(info).toHaveBeenCalledTimes(2)
  const started = JSON.parse(info.mock.calls[0]![0] as string)
  const completed = JSON.parse(info.mock.calls[1]![0] as string)

  expect(started).toMatchObject({ message: 'request started', method: 'GET', path: '/api/me' })
  expect(completed).toMatchObject({
    message: 'request completed',
    method: 'GET',
    path: '/api/me',
    user: 'anonymous',
    status: 401,
  })
  expect(completed.requestId).toBe(started.requestId)
  expect(typeof completed.durationMs).toBe('number')

  info.mockRestore()
})
