import { readonly, ref } from 'vue'

const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
window.addEventListener('online', () => (online.value = true))
window.addEventListener('offline', () => (online.value = false))

/** オフライン状態であることを表示するための、ネットワーク接続の状態 */
export const isOnline = readonly(online)
