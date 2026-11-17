# apps/frontend

- Vue 3 (Composition API, `<script setup>`).
- Vuetify 4 for UI components and theming (`src/plugins/vuetify.ts`, light theme only). Icons are SVG paths from `@mdi/js`, re-exported by name from `src/icons.ts` (no icon font). The font is Noto Sans JP (`@fontsource-variable/noto-sans-jp`); shared styles and `--mm-*` color variables are in `src/styles/main.css`.
- Layout switches on width in `src/composables/layout.ts` (phone < 768px, tablet ≥ 768px with the category sidebar, desktop ≥ 1280px with the memo editor panel), not on Vuetify's default breakpoints.
- vue-router for routing. The route table lives in `src/router/routes.ts`, separate from `src/router/index.ts` (which builds the actual `router` with `createWebHistory()` and the sign-in / terms guard), so tests can import `routes` without pulling in a browser-only history. Pages are in `src/pages/`, the rest of the screens in `src/components/`.
- App updates: `vite-plugin-pwa` (`generateSW`, `registerType: 'prompt'`, with a manifest so the app can be installed) generates `sw.js` on build; `src/composables/usePwaUpdate.ts` registers it and `src/components/AppSnackbars.vue` shows the "新しいバージョンがあります" snackbar. Never switch to `autoUpdate` or call `skipWaiting()` unasked (a half-filled form would be lost), never cache `/api` in the service worker, and don't register a service worker anywhere else. It's off in `vp dev`; check it with a production build. Hosts must serve over HTTPS and must not long-cache `sw.js` / `index.html`.
- TypeScript is pinned to `^6.x` here, independent of the workspace catalog's `^7.x`: `vue-tsc`/Vue Language Tools can't type-check `.vue` SFCs against TypeScript 7's native compiler yet (no public Program API). Re-sync to the catalog once vue-tsc supports it.

## API

`src/api/index.ts` exports `api`, built on the Hono RPC client (`hc<AppType>('/')`, a type-only import of `apps/backend`'s `AppType`; requests go to `/api` on the same origin, with the `HttpOnly` session cookie). `send()` turns an error response `{ code, message }` or a failed connection into an `ApiError`. `src/api/types.ts` derives the row types (`Category`, `Memo`, `Me`, ...) from the client with `InferResponseType`/`InferRequestType` — no hand-written DTOs. In dev, `vite.config.ts` proxies `/api` to the Worker on `localhost:8787`.

Sign-in: `src/components/GoogleSignIn.vue` renders the official Google button (Google Identity Services) once consent is given and `VITE_GOOGLE_WEB_CLIENT_ID` is set, otherwise a disabled stand-in. Under `vp dev` the login page also shows a 開発用ログイン button (`POST /api/auth/dev`), which the Worker accepts only from its `dev` script (`wrangler dev --var DEV_LOGIN:true`).

## State

The screens always show the local copy in IndexedDB (`docs/spec.md` "同期（D1 → IndexedDB）"), so there's no request cache to manage:

- `src/stores/data.ts` — categories and memos, loaded from IndexedDB (`src/db/idb.ts`). `sync()` pulls the diff since the last sync time (or everything); every write goes to the API only when online and applies the returned `ChangedRows` to IndexedDB and the screen. Components call these functions, never `api` directly.
- `src/stores/session.ts` — sign-in state and terms agreement; `src/stores/prefs.ts` — per-device settings in `localStorage`; `src/stores/notify.ts` — the message snackbar and the user-facing text for each `ApiError` code.
- `src/composables/` — `confirm.ts` (the shared confirm dialog), `online.ts` (connection state), `layout.ts`, `usePwaUpdate.ts`.
- Stores are module-level `reactive`/`computed` state, not Pinia. Keep local/component state (dialogs, form inputs) in component `ref`s.
- Don't destructure values out of `props` or a `reactive` object; it breaks reactivity. Use `toRefs()` or `toValue()` instead.

## Testing

Tests run in Node (no jsdom/happy-dom), so keep test subjects DOM-free — test pure helpers and router config directly rather than mounting components. Modules that touch `window`, `localStorage` or IndexedDB at import time (`src/stores/*`, `src/composables/online.ts`) can't be imported in a test as they are. Run with `vp test` / `vp run frontend#test`.

- Helpers (`src/utils/search.test.ts`, `src/utils/csv.test.ts`): call them and assert the result.
- Router (`src/router/routes.test.ts`): build a throwaway router from the exported `routes` with vue-router's `createMemoryHistory()`, and assert with `router.resolve(...)` rather than `router.push(...)` — `push` actually loads the matched route's lazy component, which drags in Vuetify's CSS and breaks under Node's module loader. `resolve()` doesn't follow redirects.
