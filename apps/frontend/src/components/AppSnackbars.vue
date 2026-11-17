<script setup lang="ts">
import { usePwaUpdate } from '../composables/usePwaUpdate.ts'
import { notice } from '../stores/notify.ts'

const { needRefresh, update } = usePwaUpdate()
</script>

<template>
  <!-- 操作の結果・エラー -->
  <v-snackbar
    v-model="notice.visible"
    :timeout="notice.error ? 6000 : 3000"
    location="bottom"
    max-width="560"
  >
    {{ notice.text }}
    <template #actions>
      <v-btn variant="text" color="#9DB7FF" @click="notice.visible = false">OK</v-btn>
    </template>
  </v-snackbar>

  <!-- 新しいバージョン。閉じるまで表示し、ほかのスナックバーの表示中は隠れる -->
  <v-snackbar
    :model-value="needRefresh && !notice.visible"
    :timeout="-1"
    location="bottom"
    max-width="560"
    persistent
  >
    新しいバージョンがあります
    <template #actions>
      <v-btn variant="text" color="#C7D3F5" @click="needRefresh = false">後で</v-btn>
      <v-btn variant="text" color="#9DB7FF" @click="update">更新</v-btn>
    </template>
  </v-snackbar>
</template>
