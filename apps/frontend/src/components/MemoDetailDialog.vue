<script setup lang="ts">
import type { Memo } from '../api/types.ts'
import { iconClose, iconDelete, iconEdit } from '../icons.ts'
import { formatDateTime } from '../utils/datetime.ts'
import HighlightText from './HighlightText.vue'
import MemoKeyword from './MemoKeyword.vue'

/** キーワードとメモの詳細。閉じると検索結果に戻り、別の結果を確認できる */
const open = defineModel<boolean>({ required: true })
defineProps<{ memo: Memo | null; query: string }>()
const emit = defineEmits<{ edit: [memo: Memo]; remove: [memo: Memo] }>()
</script>

<template>
  <v-dialog v-model="open" max-width="560" scrollable>
    <v-card v-if="memo" class="pa-1" :aria-label="memo.keyword ?? 'メモ'">
      <v-card-item class="pb-0">
        <div class="text-body-small mm-sub mb-1">キーワード</div>
        <MemoKeyword :memo="memo" :query="query" wrap class="text-title-large" />
        <template #append>
          <v-btn :icon="iconClose" variant="text" aria-label="閉じる" @click="open = false" />
        </template>
      </v-card-item>
      <v-card-text class="pt-4">
        <div class="text-body-small mm-sub mb-1">メモ</div>
        <p class="mm-body mm-prewrap"><HighlightText :text="memo.body" :query="query" /></p>
        <p class="text-body-small mm-sub mt-3">更新 {{ formatDateTime(memo.updatedAt) }}</p>
      </v-card-text>
      <v-divider />
      <v-card-actions class="ga-2 px-3 py-2">
        <v-btn
          :icon="iconDelete"
          variant="text"
          color="error"
          aria-label="削除"
          @click="emit('remove', memo)"
        />
        <v-spacer />
        <v-btn variant="outlined" :prepend-icon="iconEdit" @click="emit('edit', memo)">編集</v-btn>
        <v-btn variant="flat" color="primary" @click="open = false">{{
          query ? '検索結果に戻る' : '閉じる'
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.mm-body {
  font-size: 15px;
  line-height: 1.75;
  background: #f7f8fa;
  border-radius: 10px;
  padding: 12px 14px;
  color: #1a1d21;
}
</style>
