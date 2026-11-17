<script setup lang="ts">
import { LIMITS } from 'utils'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import type { Memo } from '../api/types.ts'
import { memoLeftWidth } from '../stores/prefs.ts'
import HighlightText from './HighlightText.vue'
import MemoKeyword from './MemoKeyword.vue'

/**
 * メモ一覧（2カラム表示）。左=キーワード、右=メモ本文を上揃えで並べる。
 * 境界線はドラッグ（またはキーボードの左右キー）で動かせる。左右とも最小幅より狭くはできない。
 */
defineProps<{ memos: Memo[]; query: string; selectedId?: string | null }>()
const emit = defineEmits<{ open: [memo: Memo] }>()

const MIN = LIMITS.memoColumnMinWidthPx
const box = ref<HTMLElement | null>(null)
const boxWidth = ref(0)

let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(([entry]) => {
    if (entry) boxWidth.value = entry.contentRect.width
  })
  if (box.value) ro.observe(box.value)
})
onBeforeUnmount(() => ro?.disconnect())

const clamp = (w: number) => {
  const max = Math.max(MIN, boxWidth.value - MIN)
  return Math.min(max, Math.max(MIN, w))
}
// 境界線を動かしていない間は、一覧の幅の 38%（最大 220px）
const preferred = computed(
  () => memoLeftWidth.value ?? Math.min(220, Math.round(boxWidth.value * 0.38)),
)
const left = computed(() => (boxWidth.value ? clamp(preferred.value) : 220))
const cols = computed(() => `${left.value}px minmax(0, 1fr)`)

let drag: { x: number; w: number } | null = null
const onDown = (e: PointerEvent) => {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  drag = { x: e.clientX, w: left.value }
}
const onMove = (e: PointerEvent) => {
  if (!drag) return
  memoLeftWidth.value = clamp(drag.w + e.clientX - drag.x)
}
const onUp = () => {
  drag = null
}
const onKey = (e: KeyboardEvent) => {
  const step = e.shiftKey ? 64 : 16
  if (e.key === 'ArrowLeft') memoLeftWidth.value = clamp(left.value - step)
  else if (e.key === 'ArrowRight') memoLeftWidth.value = clamp(left.value + step)
  else return
  e.preventDefault()
}
</script>

<template>
  <div ref="box" class="mm-card mm-two">
    <div class="mm-grid mm-head" :style="{ gridTemplateColumns: cols }">
      <div class="mm-cell text-label-large mm-sub">キーワード</div>
      <div class="mm-cell text-label-large mm-sub">メモ</div>
    </div>
    <div
      v-for="m in memos"
      :key="m.id"
      class="mm-grid mm-item"
      :class="{ 'mm-item--selected': m.id === selectedId }"
      :style="{ gridTemplateColumns: cols }"
      role="button"
      tabindex="0"
      @click="emit('open', m)"
      @keydown.enter.prevent="emit('open', m)"
    >
      <div class="mm-cell"><MemoKeyword :memo="m" :query="query" wrap /></div>
      <div class="mm-cell mm-prewrap"><HighlightText :text="m.body" :query="query" /></div>
    </div>

    <div
      class="mm-divider"
      :style="{ left: `${left - 10}px` }"
      role="separator"
      aria-orientation="vertical"
      aria-label="キーワードとメモの境界線（ドラッグで幅を変更）"
      :aria-valuenow="Math.round(left)"
      :aria-valuemin="MIN"
      :aria-valuemax="Math.round(Math.max(MIN, boxWidth - MIN))"
      tabindex="0"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @keydown="onKey"
    >
      <span class="mm-divider__line" />
      <span class="mm-divider__handle" />
    </div>
  </div>
</template>

<style scoped>
.mm-two {
  position: relative;
}
.mm-grid {
  display: grid;
  align-items: start;
}
.mm-head {
  background: #fafbfc;
  border-bottom: 1px solid var(--mm-line);
}
.mm-head .mm-cell {
  padding-block: 9px;
}
.mm-cell {
  padding: 13px 16px;
  min-width: 0;
  font-size: 15px;
  line-height: 1.65;
}
.mm-item {
  border-bottom: 1px solid var(--mm-line-soft);
  cursor: pointer;
}
.mm-item:last-of-type {
  border-bottom: none;
}
.mm-item:hover {
  background: #f7f8fa;
}
.mm-item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}
.mm-item--selected,
.mm-item--selected:hover {
  background: #eef3fd;
}
.mm-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 20px;
  display: flex;
  justify-content: center;
  cursor: col-resize;
  touch-action: none;
}
.mm-divider:focus-visible {
  outline: none;
}
.mm-divider__line {
  width: 1px;
  height: 100%;
  background: #c9ced6;
}
.mm-divider__handle {
  position: absolute;
  top: 50%;
  width: 6px;
  height: 40px;
  margin-top: -20px;
  border-radius: 3px;
  background: rgb(var(--v-theme-primary));
  opacity: 0.85;
}
.mm-divider:hover .mm-divider__handle,
.mm-divider:focus-visible .mm-divider__handle {
  opacity: 1;
  width: 8px;
}
</style>
