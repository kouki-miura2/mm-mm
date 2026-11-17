<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/** 利用規約・プライバシーポリシーへの同意。両方にチェックすると true */
const agreed = defineModel<boolean>({ default: false })
defineProps<{ title: string; description: string }>()

const terms = ref(false)
const privacy = ref(false)
const both = computed(() => terms.value && privacy.value)
watch(both, (v) => (agreed.value = v), { immediate: true })
</script>

<template>
  <section class="mm-card pa-5">
    <h2 class="text-title-medium font-weight-bold mb-1">{{ title }}</h2>
    <p class="text-body-medium mm-sub mb-2">{{ description }}</p>
    <v-checkbox v-model="terms">
      <template #label>
        <span
          ><router-link to="/terms" target="_blank" @click.stop>利用規約</router-link
          >に同意する</span
        >
      </template>
    </v-checkbox>
    <v-divider />
    <v-checkbox v-model="privacy">
      <template #label>
        <span
          ><router-link to="/privacy" target="_blank" @click.stop>プライバシーポリシー</router-link
          >に同意する</span
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
