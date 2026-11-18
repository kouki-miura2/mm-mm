# MmMm

A starter for creating a Vite+ monorepo, with `apps/backend`, `apps/frontend`, and
`packages/utils`. `apps/backend` is a runtime-agnostic Hono API, run on Cloudflare Workers by
`apps/backend-worker` or as a standalone Node.js server by `apps/backend-node` (a project keeps
one of the two). `apps/frontend` is a Vue 3 + Vuetify 4 client that talks to it through Hono RPC
(typed request/response, no hand-shared types package), and `packages/utils` holds
runtime-agnostic code shared by both.

## Development

The frontend is served at `/` and the API at `/api` on the same origin, in development and in
production. Run both dev servers and open the frontend's URL; it proxies `/api` to the backend
(`localhost:8787`):

```bash
vp run dev-b   # backend
vp run dev-f   # frontend
```

In production, the backend runtime serves both: the Worker (`apps/backend-worker`) serves the
frontend build as static assets, and the Node.js server (`apps/backend-node`) serves it with
`serveStatic`. Both list `frontend` as a workspace dependency, so `vp run -r build` (or `-t` for
one package) builds the frontend once, before them; the Worker's `deploy` builds it itself.

- Check everything is ready:

```bash
vp run ready
```

- Run all tests:

```bash
vp run -r test
```

- Build everything:

```bash
vp run -r build
```

## packages/utils

- Run format/lint/type checks:

```bash
vp run utils#check
```

- Run the tests:

```bash
vp run utils#test
```

## apps/backend

Runtime-agnostic routes and business logic. Run it through `apps/backend-worker` or `apps/backend-node`.

- Run format/lint/type checks:

```bash
vp run backend#check
```

- Run the tests:

```bash
vp run backend#test
```

## apps/backend-worker

Runs `apps/backend` on Cloudflare Workers.

- Debug locally (reloads on changes in `apps/backend` too):

```bash
vp run backend-worker#dev
```

- Build (frontend + dry-run Worker bundle):

```bash
vp run -t backend-worker#build
```

`dev` applies the D1 migrations to the local database and enables the development login
(`--var DEV_LOGIN:true`); the frontend shows its button only under `vp dev`.

- Deploy (frontend + API, one Worker):

```bash
vp run backend-worker#deploy
```

Before the first deploy, and whenever a value changes:

1. Create a web OAuth client ID in Google Cloud Console (authorized JavaScript origin: the app's
   URL, plus `http://localhost:5173` for development), then set it in both places:
   - `apps/frontend/.env.local`: `VITE_GOOGLE_WEB_CLIENT_ID=<client id>` (the sign-in button)
   - Worker secret: `npx wrangler secret put GOOGLE_CLIENT_ID` in `apps/backend-worker`
     (verifies the ID token's `aud`). For local `wrangler dev`, put it in
     `apps/backend-worker/.dev.vars` (gitignored) instead.
   - `apps/frontend/.env.local`: `VITE_OPERATOR_NAME=<operator name>` and
     `VITE_CONTACT_EMAIL=<contact email>`, shown in the terms of service and privacy policy
     (placeholders when unset)
2. Deploy once: `wrangler deploy` creates the D1 database `mm-mm` and binds it (its ID is not
   kept in the repository).
3. Apply the migrations to it, after the first deploy and after adding a file to
   `apps/backend-worker/migrations/`:

```bash
vp run backend-worker#db:migrate
```

A Cron Trigger (daily 03:00 JST) hard-deletes expired sessions and categories/memos soft-deleted
longer ago than `LIMITS.deletedRetentionMonths`.

- Regenerate Workers binding types:

```bash
vp run backend-worker#cf-typegen
```

## apps/frontend

- Run format/lint/type checks:

```bash
vp run frontend#check
```

- Run the tests:

```bash
vp run frontend#test
```

- Run the dev server:

```bash
vp run frontend#dev
```

- Build:

```bash
vp run frontend#build
```

- Preview the production build:

```bash
vp run frontend#preview
```
