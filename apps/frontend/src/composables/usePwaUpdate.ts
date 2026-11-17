import { LIMITS } from 'utils'
import { useRegisterSW } from 'virtual:pwa-register/vue'

// Updating the app (docs/spec.md "共通ルール > 画面 > アプリの更新"). The browser looks for a new
// service worker only when a page loads, and an app on a phone mostly comes back from the
// background without one, so it's also checked when the app comes to the front and every
// `LIMITS.updateCheckIntervalHours`. A new version waits for the person to tap "更新" (a form may
// be half filled in). "後で" only hides it until the app is opened again (the waiting worker stays).

/** Called once, from `AppSnackbars.vue`. Off in `vp dev` (no service worker there). */
export const usePwaUpdate = () => {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW: (_url, registration) => {
      if (!registration) return
      // Rejects offline; the next check tries again.
      const check = () => void registration.update().catch(() => {})
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      setInterval(check, LIMITS.updateCheckIntervalHours * 60 * 60 * 1000)
    },
  })

  /** Hands over to the new version; the page reloads once it has taken over. */
  const update = () => void updateServiceWorker()

  return { needRefresh, update }
}
