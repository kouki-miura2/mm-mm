<script lang="ts">
import { ref } from 'vue'

// Kept outside the component so the ticks survive a visit to the terms or privacy policy page
// (the links open in the same tab, and coming back remounts this screen).
const terms = ref(false)
const privacy = ref(false)
</script>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

/** 利用規約・プライバシーポリシーへの同意。両方にチェックすると true */
const agreed = defineModel<boolean>({ default: false })
defineProps<{ title: string; description: string }>()

const both = computed(() => terms.value && privacy.value)
watch(both, (v) => (agreed.value = v), { immediate: true })

// Leaving for anything but the documents (signed in, agreed, logged out) starts the next consent
// unticked.
onBeforeRouteLeave((to) => {
  if (to.name === 'terms' || to.name === 'privacy') return
  terms.value = false
  privacy.value = false
})
</script>

<template>
  <section class="mm-card pa-5">
    <h2 class="text-title-medium font-weight-bold mb-1">{{ title }}</h2>
    <p class="text-body-medium mm-sub mb-2">{{ description }}</p>
    <v-checkbox v-model="terms">
      <template #label>
        <span><router-link to="/terms" @click.stop>利用規約</router-link>に同意する</span>
      </template>
    </v-checkbox>
    <v-divider />
    <v-checkbox v-model="privacy">
      <template #label>
        <span
          ><router-link to="/privacy" @click.stop>プライバシーポリシー</router-link>に同意する</span
        >
      </template>
    </v-checkbox>
  </section>
</template>

<style scoped>
:deep(.v-label) {
  opacity: 1;
  font-size: 15px;
}
a {
  color: rgb(var(--v-theme-primary));
}
</style>
