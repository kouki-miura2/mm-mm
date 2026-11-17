import { createApp, PUBLIC_PATHS } from 'backend/src/app.ts'
import { createSessionAuthGuard } from 'backend/src/repository/auth-guard.session.ts'
import { createGoogleIdTokenVerifier } from 'backend/src/repository/id-token.google.ts'
import { createNoteRepository } from 'backend/src/repository/note.repository.ts'
import { createUserRepository } from 'backend/src/repository/user.repository.ts'
import { createAuthService } from 'backend/src/service/auth.service.ts'
import { createNoteService } from 'backend/src/service/note.service.ts'

import { createD1Daos } from './dao/tables.d1.ts'

/** `wrangler.jsonc` bindings plus secrets (`wrangler secret put`) and `--var`s, unset when missing. */
type Bindings = Env & {
  /** Web OAuth client ID: the `aud` of Google ID tokens. Sign-in with Google fails without it. */
  GOOGLE_CLIENT_ID?: string
  /** `"true"` only from `wrangler dev --var DEV_LOGIN:true` (the `dev` script). */
  DEV_LOGIN?: string
}

const createServices = (env: Bindings) => {
  const daos = createD1Daos(env.DB)
  const authService = createAuthService(
    createUserRepository(daos.userDao, daos.sessionDao),
    createGoogleIdTokenVerifier(env.GOOGLE_CLIENT_ID ?? ''),
  )
  const noteService = createNoteService(createNoteRepository(daos.categoryDao, daos.memoDao))
  return { authService, noteService }
}

// Bindings don't change within an isolate, so the app is built once.
let app: ReturnType<typeof createApp> | undefined

export default {
  fetch: (request, env, ctx) => {
    if (!app) {
      const { authService, noteService } = createServices(env)
      app = createApp({
        authService,
        noteService,
        auth: {
          guard: createSessionAuthGuard(authService.authenticate),
          enabled: true,
          excludePaths: PUBLIC_PATHS,
        },
        devLogin: env.DEV_LOGIN === 'true',
      })
    }
    return app.fetch(request, env, ctx)
  },

  // Cron Trigger (`triggers` in wrangler.jsonc): hard-deletes expired sessions, and categories and
  // memos soft-deleted longer ago than `LIMITS.deletedRetentionMonths`.
  scheduled: async (_controller, env) => {
    const { authService, noteService } = createServices(env)
    await authService.purgeExpiredSessions()
    await noteService.purgeDeleted()
  },
} satisfies ExportedHandler<Bindings>
