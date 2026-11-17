<script setup lang="ts">
import { ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'

import type { Memo } from '../api/types.ts'
import { iconDelete, iconDrag } from '../icons.ts'
import { displayKeyword } from '../utils/search.ts'
import MemoKeyword from './MemoKeyword.vue'

/** メモ一覧編集モード。表示順をドラッグ&ドロップで変更し、削除もできる */
const props = defineProps<{ memos: Memo[]; compact?: boolean }>()
const emit = defineEmits<{ reorder: [ids: string[]]; remove: [memo: Memo] }>()

const list = ref<Memo[]>([])
watch(
  () => props.memos,
  (v) => (list.value = [...v]),
  { immediate: true },
)
</script>

<template>
  <div class="mm-card">
    <VueDraggable
      v-model="list"
      handle=".mm-grip"
      :animation="150"
      ghost-class="mm-ghost"
      @end="
        emit(
          'reorder',
          list.map((m) => m.id),
        )
      "
    >
      <div v-for="m in list" :key="m.id" class="mm-reorder mm-row-line">
        <span class="mm-grip" aria-hidden="true"><v-icon :icon="iconDrag" size="20" /></span>
        <MemoKeyword :memo="m" class="mm-reorder__kw" :class="{ 'flex-grow-1': compact }" />
        <span v-if="!compact" class="mm-ellipsis flex-grow-1 mm-sub text-body-medium">{{
          m.body
        }}</span>
        <v-btn
          :icon="iconDelete"
          variant="text"
          color="error"
          size="small"
          :aria-label="`「${displayKeyword(m).text}」を削除`"
          @click="emit('remove', m)"
        />
      </div>
    </VueDraggable>
  </div>
</template>

<style scoped>
.mm-reorder {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 56px;
  padding: 0 6px 0 2px;
  background: #fff;
}
.mm-reorder__kw {
  width: 200px;
  flex-shrink: 0;
  padding-right: 12px;
}
.mm-grip {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a919c;
  cursor: grab;
  touch-action: none;
  flex-shrink: 0;
}
.mm-ghost {
  opacity: 0.4;
  background: var(--mm-accent-soft);
}
</style>
