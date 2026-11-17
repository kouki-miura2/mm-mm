<script setup lang="ts">
import type { Memo } from '../api/types.ts'
import { iconChevron } from '../icons.ts'
import MemoKeyword from './MemoKeyword.vue'

/** メモ一覧（1カラム表示）。キーワードを1行で表示し、タップで詳細を開く */
defineProps<{ memos: Memo[]; query: string }>()
const emit = defineEmits<{ open: [memo: Memo] }>()
</script>

<template>
  <div class="mm-card">
    <button
      v-for="m in memos"
      :key="m.id"
      type="button"
      class="mm-row mm-row-line"
      @click="emit('open', m)"
    >
      <MemoKeyword :memo="m" :query="query" class="flex-grow-1 text-body-large" />
      <v-icon :icon="iconChevron" size="18" color="#8A919C" />
    </button>
  </div>
</template>

<style scoped>
.mm-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 10px 0 16px;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.mm-row:hover {
  background: #f7f8fa;
}
.mm-row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}
</style>
