import { computed, readonly, ref } from 'vue'

/** Chromium's install event (not in the DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Registered on import, from main.ts: the browser may fire `beforeinstallprompt` right after the
// page loads, long before the settings screen opens.
const deferred = ref<BeforeInstallPromptEvent | null>(null)
const standalone = window.matchMedia('(display-mode: standalone)')
const installed = ref(
  standalone.matches || (navigator as { standalone?: boolean }).standalone === true,
)
standalone.addEventListener('change', (e) => (installed.value = e.matches))
window.addEventListener('beforeinstallprompt', (e) => {
  // Keep the browser's own banner away; the settings screen offers the install instead
  e.preventDefault()
  deferred.value = e as BeforeInstallPromptEvent
})
window.addEventListener('appinstalled', () => {
  deferred.value = null
  installed.value = true
})

/** Running as the installed app (opened from the home screen or the app window). */
export const isInstalled = readonly(installed)

/** The browser can show its install dialog (Chrome, Edge, Samsung Internet...). */
export const canPromptInstall = computed(() => deferred.value !== null)

/** Shows the browser's install dialog. Each event can prompt once. */
export const promptInstall = async () => {
  const event = deferred.value
  if (!event) return 'unavailable'
  deferred.value = null
  await event.prompt()
  return (await event.userChoice).outcome
}

/** Which manual steps to show when the browser can't prompt (iOS, Safari, Firefox...). */
export type InstallGuide = 'ios' | 'mac-safari' | 'android' | 'desktop'

export const installGuide = (): InstallGuide => {
  const ua = navigator.userAgent
  // iPadOS reports itself as a Mac; touch tells them apart
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'ios'
  }
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua)) {
    return 'mac-safari'
  }
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}
