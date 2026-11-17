# Public app conventions

Conventions for an app offered to the public: Sign in with Google, terms of service and a privacy policy, the operator's details, and consent on sign-up. Record the chosen behavior in `docs/spec.md` ("共通ルール > 同意") when it exists.

## Config values

Add these as in "Public config values for the frontend" in the root `AGENTS.md`:

```
# VITE_GOOGLE_WEB_CLIENT_ID=<web OAuth client id>
# VITE_OPERATOR_NAME=<operator name shown in the terms and privacy policy>
# VITE_CONTACT_EMAIL=<contact email shown in the terms and privacy policy>
```

The backend also needs the client ID, as a secret; list both places in `README.md`.

## Sign in with Google

- Consent comes before the sign-in (see below). The official Google button (Google Identity Services) can't be disabled, so don't render it until consent is given; show the disabled stand-in button below in its place until then.
- The API verifies the ID token, with the client ID as its `aud`.
- Until consent is given, and always when `VITE_GOOGLE_WEB_CLIENT_ID` is unset, show a disabled `v-btn` that looks like the official button in its place: `size: large`, `shape: pill`, 40px high, at most 400px wide. A development login may stand in for Google (see "Auth" in the root `AGENTS.md`).

## Terms of service and privacy policy

- Embed the operator's name and contact email (e.g. in `apps/frontend/src/legal/documents.ts`) instead of writing them into the text:
  ```ts
  const OPERATOR = import.meta.env.VITE_OPERATOR_NAME || '（運営者名）'
  const CONTACT = import.meta.env.VITE_CONTACT_EMAIL || '（お問い合わせ先）'
  ```
- The text is a draft the operator checks for legal issues themselves; don't present it as legally reviewed.

## Consent on sign-up

1. The welcome screen shows links to the terms of service and privacy policy and a consent checkbox, above the sign-in button. The official Google button appears only once it's ticked (see "Sign in with Google").
2. The terms version agreed to on this device is kept in `localStorage`. When it's the current version, the welcome screen skips the checkbox and shows the Google button straight away.
3. After sign-in, send the ID token with the terms version agreed to (or `null` when this device hasn't agreed). The API creates an unregistered user only with a version, so consent is recorded on the server; without one it refuses (e.g. `403 terms_not_agreed`), and the welcome screen shows the checkbox again.
4. A registered user goes straight to the home screen. When their agreed version on the server isn't current (the terms were revised), they agree again on a consent screen before using the app (e.g. "同意して始める"), which records the new version through the API.

Links from the consent checkbox to the terms open in a new tab: the same tab would lose the ticked checkbox (and, on the re-consent screen, the screen itself).
