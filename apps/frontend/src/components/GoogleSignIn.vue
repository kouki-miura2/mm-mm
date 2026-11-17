<script setup lang="ts">
/**
 * Googleでログイン（Google Identity Services の公式ボタン）。公式ボタンは無効にできないため、
 * `disabled` の間とクライアントID未設定のときは、同じ見た目の無効なボタンを代わりに表示する。
 */
import { nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps<{ disabled: boolean }>()
const emit = defineEmits<{ credential: [idToken: string] }>()

const clientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || ''
const el = ref<HTMLElement>()

interface GoogleId {
  initialize: (options: {
    client_id: string
    callback: (response: { credential: string }) => void
  }) => void
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

let loading: Promise<GoogleId> | null = null
const loadGoogle = () =>
  (loading ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => (window.google ? resolve(window.google.accounts.id) : reject())
    script.onerror = () => {
      loading = null
      reject(new Error('Google Identity Services failed to load'))
    }
    document.head.append(script)
  }))

const render = async () => {
  if (!clientId || props.disabled || !el.value) return
  try {
    const google = await loadGoogle()
    google.initialize({
      client_id: clientId,
      callback: (response) => emit('credential', response.credential),
    })
    google.renderButton(el.value, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
      locale: 'ja',
      width: Math.min(400, el.value.clientWidth),
    })
  } catch {
    /* オフラインなどで読み込めないときは代わりのボタンのまま */
  }
}

onMounted(render)
// 同意のチェックで有効になったら、表示された要素に公式ボタンを描く
watch(
  () => props.disabled,
  () => void nextTick(render),
)
</script>

<template>
  <div class="mm-google">
    <div v-if="clientId && !disabled" ref="el" class="mm-google-button" />
    <v-btn
      v-else
      block
      size="large"
      rounded="pill"
      variant="outlined"
      height="40"
      disabled
      class="mm-google-button"
    >
      Googleでログイン
    </v-btn>
  </div>
</template>

<style scoped>
.mm-google {
  display: flex;
  justify-content: center;
}
.mm-google-button {
  width: 100%;
  max-width: 400px;
  min-height: 40px;
  display: flex;
  justify-content: center;
}
</style>
