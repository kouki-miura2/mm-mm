<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { iconBack } from '../icons.ts'
import { documents, type LegalKind } from '../legal/documents.ts'

const props = defineProps<{ kind: LegalKind }>()
const router = useRouter()
const doc = computed(() => documents[props.kind])

/**
 * Back to the screen that opened it (the welcome, re-consent or settings screen). Opened directly
 * (a bookmark or a reload of a fresh tab), there's no such screen: go home, which the router
 * sends to the welcome screen before sign-in.
 */
const back = () => (window.history.state?.back ? router.back() : router.replace('/'))
</script>

<template>
  <v-app-bar flat color="surface" height="56" border="b">
    <v-btn :icon="iconBack" variant="text" aria-label="戻る" @click="back" />
    <v-app-bar-title class="text-title-large font-weight-bold ms-1">{{
      doc.title
    }}</v-app-bar-title>
  </v-app-bar>
  <article class="mm-legal">
    <p class="text-body-small mm-sub mb-4">改定日 {{ doc.revisedAt.replaceAll('-', '/') }}</p>
    <p class="text-body-large mb-6">{{ doc.intro }}</p>
    <section v-for="s in doc.sections" :key="s.heading" class="mb-6">
      <h2 class="text-title-medium font-weight-bold mb-2">{{ s.heading }}</h2>
      <p v-for="(p, i) in s.paragraphs" :key="i" class="text-body-large mb-2">{{ p }}</p>
    </section>
    <v-btn variant="outlined" class="mt-2" @click="back">戻る</v-btn>
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
