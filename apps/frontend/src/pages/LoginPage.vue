<script setup lang="ts">
import { TERMS_VERSION } from 'utils'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { ApiError } from '../api/index.ts'
import AppLogo from '../components/AppLogo.vue'
import TermsConsent from '../components/TermsConsent.vue'
import { isOnline } from '../composables/online.ts'
import { iconLogin } from '../icons.ts'
import { messageFor, notify } from '../stores/notify.ts'
import { deviceAgreedTerms } from '../stores/prefs.ts'
import { login } from '../stores/session.ts'

const router = useRouter()

/** 初回利用時は、Googleでログインする前に同意する。この端末で現行の版に同意済みなら省略する */
const needConsent = ref(deviceAgreedTerms.value !== TERMS_VERSION)
const consent = ref(false)
const canLogin = computed(() => (!needConsent.value || consent.value) && isOnline.value)
const busy = ref(false)

const onCredential = async (idToken: string) => {
  if (!canLogin.value) return
  busy.value = true
  try {
    if (needConsent.value) deviceAgreedTerms.value = TERMS_VERSION
    await login(idToken)
    void router.replace('/')
  } catch (err) {
    if (err instanceof ApiError && err.code === 'terms_not_agreed') {
      // 未登録のユーザー。先に同意してもらう
      needConsent.value = true
      deviceAgreedTerms.value = null
    }
    notify(messageFor(err), true)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mm-login">
    <div class="d-flex flex-column ga-3">
      <AppLogo :size="44" />
      <p class="text-body-large mm-sub">
        カテゴリごとにメモを登録・管理するツール。<br />キーワードとメモをすぐに検索できます。
      </p>
    </div>

    <TermsConsent
      v-if="needConsent"
      v-model="consent"
      class="mt-10"
      title="はじめる前に"
      description="ご利用には、利用規約とプライバシーポリシーへの同意が必要です。"
    />

    <div class="flex-grow-1" />

    <div class="mt-10">
      <!-- モックAPIのログイン。バックエンドを用意するときに Googleでログインへ置き換える -->
      <v-btn
        block
        size="x-large"
        rounded="lg"
        variant="flat"
        :color="canLogin ? 'primary' : undefined"
        :disabled="!canLogin"
        :loading="busy"
        :prepend-icon="iconLogin"
        @click="onCredential('mock-id-token')"
      >
        Googleでログイン
      </v-btn>
      <p v-if="!isOnline" class="text-body-small text-error text-center mt-3">
        オフラインのためログインできません。
      </p>
      <p class="text-body-small mm-sub text-center mt-4">
        ログイン後、メモはこの端末にも保存され、<br />オフラインでも閲覧できます。
      </p>
      <p class="text-body-small mm-sub text-center mt-2">
        （モックモード：実際のGoogleアカウントは使いません）
      </p>
    </div>
  </div>
</template>

<style scoped>
.mm-login {
  max-width: 440px;
  min-height: 100dvh;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  padding: 96px 24px 32px;
}
</style>
