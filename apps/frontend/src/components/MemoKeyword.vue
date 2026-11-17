<script setup lang="ts">
import { computed } from 'vue'

import type { Memo } from '../api/types.ts'
import { displayKeyword } from '../utils/search.ts'
import HighlightText from './HighlightText.vue'

const props = defineProps<{ memo: Memo; query?: string; wrap?: boolean }>()
const kw = computed(() => displayKeyword(props.memo))
</script>

<template>
  <span class="mm-kw" :class="{ 'mm-kw--wrap': wrap }">
    <span v-if="kw.fallback" class="mm-chip-body">本文</span>
    <span class="mm-kw__text" :class="kw.fallback ? 'mm-sub' : 'font-weight-medium'">
      <HighlightText :text="kw.text" :query="query" />
    </span>
  </span>
</template>

<style scoped>
.mm-kw {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.mm-kw__text {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mm-kw--wrap {
  align-items: flex-start;
}
.mm-kw--wrap .mm-chip-body {
  margin-top: 3px;
}
.mm-kw--wrap .mm-kw__text {
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
