<script setup lang="ts">
import { TERMS_VERSION } from 'utils'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { iconBack } from '../icons.ts'

const props = defineProps<{ kind: 'terms' | 'privacy' }>()
const router = useRouter()
const title = computed(() => (props.kind === 'terms' ? '利用規約' : 'プライバシーポリシー'))

const back = () => (window.history.length > 1 ? router.back() : router.push('/'))
</script>

<template>
  <v-app-bar flat color="surface" height="56" border="b">
    <v-btn :icon="iconBack" variant="text" aria-label="戻る" @click="back" />
    <v-app-bar-title class="text-title-large font-weight-bold ms-1">{{ title }}</v-app-bar-title>
  </v-app-bar>
  <article class="mm-legal">
    <p class="text-body-small mm-sub mb-4">版 {{ TERMS_VERSION }}</p>
    <!-- 本文は確定後に差し替える -->
    <p class="text-body-large">[{{ title }}の本文]</p>
  </article>
</template>

<style scoped>
.mm-legal {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
  line-height: 1.8;
}
</style>
