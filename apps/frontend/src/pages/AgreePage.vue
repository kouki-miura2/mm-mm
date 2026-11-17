<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import AppLogo from '../components/AppLogo.vue'
import TermsConsent from '../components/TermsConsent.vue'
import { messageFor, notify } from '../stores/notify.ts'
import { agreeTerms, logout } from '../stores/session.ts'

/** 利用規約・プライバシーポリシー改定時、アプリの使用開始前に同意する */
const router = useRouter()
const consent = ref(false)
const busy = ref(false)

const agree = async () => {
  busy.value = true
  try {
    await agreeTerms()
    void router.replace('/')
  } catch (err) {
    notify(messageFor(err), true)
  } finally {
    busy.value = false
  }
}

const onLogout = async () => {
  await logout().catch(() => {})
  void router.replace('/login')
}
</script>

<template>
  <div class="mm-agree">
    <AppLogo :size="32" />
    <TermsConsent
      v-model="consent"
      class="mt-8"
      title="利用規約・プライバシーポリシーを改定しました"
      description="引き続きご利用いただくには、改定後の内容への同意が必要です。"
    />
    <v-btn
      class="mt-6"
      block
      size="x-large"
      variant="flat"
      color="primary"
      :disabled="!consent"
      :loading="busy"
      @click="agree"
    >
      同意して始める
    </v-btn>
    <v-btn class="mt-2" block variant="text" @click="onLogout">ログアウト</v-btn>
  </div>
</template>

<style scoped>
.mm-agree {
  max-width: 480px;
  margin: 0 auto;
  padding: 72px 24px 32px;
}
</style>
