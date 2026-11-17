import { parse } from 'hono/utils/cookie'

import type { AuthGuard, AuthenticatedUser } from './auth-guard.interface.ts'

/** Name of the `HttpOnly` cookie holding the session token. */
export const SESSION_COOKIE = 'mmmm_session'

/** Reads the session token from its cookie and resolves it with `authenticate` (`AuthService`). */
export const createSessionAuthGuard = (
  authenticate: (token: string) => Promise<AuthenticatedUser | null>,
): AuthGuard => ({
  authenticate: async (request) => {
    const token = parse(request.headers.get('cookie') ?? '', SESSION_COOKIE)[SESSION_COOKIE]
    return token ? authenticate(token) : null
  },
})
