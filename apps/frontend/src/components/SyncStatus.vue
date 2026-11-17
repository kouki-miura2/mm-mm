<script setup lang="ts">
import { computed } from 'vue'

import { isOnline } from '../composables/online.ts'
import { iconCheck, iconOffline, iconSync } from '../icons.ts'
import { data } from '../stores/data.ts'
import { formatDateTime } from '../utils/datetime.ts'

const view = computed(() => {
  if (!isOnline.value)
    return {
      icon: iconOffline,
      color: undefined,
      text: data.syncedAt ? `最終同期 ${formatDateTime(data.syncedAt)}` : 'オフライン',
    }
  if (data.syncing) return { icon: iconSync, color: 'primary', text: '同期中…' }
  if (data.syncedAt)
    return { icon: iconCheck, color: 'success', text: `同期済み ${formatDateTime(data.syncedAt)}` }
  return { icon: iconSync, color: undefined, text: '未同期' }
})
</script>

<template>
  <div class="d-flex align-center ga-1 text-body-small mm-sub" role="status">
    <v-icon :icon="view.icon" :color="view.color" size="15" />
    <span>{{ view.text }}</span>
  </div>
</template>
