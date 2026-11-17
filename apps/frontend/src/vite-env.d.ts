/** The app version: the root `package.json` `version`, set by `vite.config.ts`. */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string
  /** Web OAuth client ID for Sign in with Google. Unset: a disabled stand-in button. */
  readonly VITE_GOOGLE_WEB_CLIENT_ID?: string
}
