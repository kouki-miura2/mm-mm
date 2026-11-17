---
name: add-view
description: Add a new screen/view to apps/frontend - creating the page component, wiring it into the router, and using the app's data/session stores the Vue+Vuetify+vue-router way. Use when adding, wiring, or scaffolding a new frontend page/screen/route.
---

# Add a frontend page

`apps/frontend` is Vue 3 (`<script setup>`) + Vuetify 4 + vue-router. Data comes from the
IndexedDB-backed stores in `src/stores/` (see `apps/frontend/AGENTS.md`). A screen is a page
component plus a route table entry, and sometimes a store function.

Worked references:

- `src/pages/SettingsPage.vue` — reads `src/stores/data.ts`, calls session actions, switches
  layout with `useLayout()`, confirms with `confirm()` and reports with `notify()`.
- `src/pages/LegalPage.vue` — a public page (no sign-in needed) taking route `props`.
- `src/router/routes.ts` / `src/router/routes.test.ts` — the route table and its test.

## Procedure

### 1. Decide what the page needs

- **Categories / memos**: read them from `src/stores/data.ts` (`categories`, `memosOf(id)`, ...).
  A new write is a new function there that goes through its `write()` helper, plus a method on
  the `Api` interface (`src/api/types.ts`) and its implementation in `src/api/mock.ts`. Never
  call `api` from a component.
- **Sign-in / terms**: `src/stores/session.ts`. **Per-device settings**: `src/stores/prefs.ts`.
- **Local state** (form inputs, dialogs): plain `ref()`/`reactive()` in the page.

### 2. Create the page

- `src/pages/<Name>Page.vue` — `<script setup lang="ts">`, Vuetify components, the shared
  classes in `src/styles/main.css` (`mm-card`, `mm-sub`, ...) and icons from `src/icons.ts`.
- Lay it out for phone, tablet and desktop with `useLayout()` (`isWide`, `isDesktop`). On a
  phone, a page shows its own `v-app-bar`; on wider screens `App.vue` shows the shell.
- Show results and errors with `notify(text)` / `notify(messageFor(err), true)`.
- Every cap comes from `LIMITS` in `packages/utils`, never a literal.

### 3. Register the route

- Add `{ path: '/<path>', name: '<name>', component: () => import('../pages/<Name>Page.vue') }`
  to `src/router/routes.ts`, keeping the import lazy. Set `meta`: `shell: true` to show the
  category sidebar on wider screens, `public: true` for pages anyone can open, `guest: true` for
  pages only shown before sign-in.
- Add the path to the `test.each` table in `src/router/routes.test.ts`. Use `router.resolve(...)`,
  not `router.push(...)` — `push` loads the lazy component, which drags in Vuetify's CSS and
  breaks under Node's module loader.

### 4. Link it from navigation

- Settings-like pages: a row in `SettingsPage.vue`, or the sidebar / app bar in `App.vue` and
  `HomePage.vue`.

### 5. Validate

```bash
vp check   # format, lint, type check
vp test    # or: vp run frontend#test
```

Tests run in Node with no DOM — don't mount the page; test any new pure helper next to it
(`foo.ts` + `foo.test.ts`). To see the screen, run `vp run frontend#dev` and open it in a browser
(the mock API signs in with "Googleでログイン" and adds sample data).
