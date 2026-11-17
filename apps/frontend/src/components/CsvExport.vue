<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { iconDownload } from '../icons.ts'
import { categories, memosOf } from '../stores/data.ts'
import { notify } from '../stores/notify.ts'
import { buildCsv, downloadCsv } from '../utils/csv.ts'

/** 選択したカテゴリ（すべて、または複数）のキーワード・メモ本文を CSV でダウンロードする */
const emit = defineEmits<{ done: [] }>()

const selected = ref<string[]>([])
watch(
  categories,
  (list) => {
    // 削除されたカテゴリは選択から外す
    selected.value = selected.value.filter((id) => list.some((c) => c.id === id))
  },
  { immediate: true },
)

const all = computed({
  get: () => categories.value.length > 0 && selected.value.length === categories.value.length,
  set: (v: boolean) => (selected.value = v ? categories.value.map((c) => c.id) : []),
})
const partial = computed(() => selected.value.length > 0 && !all.value)

const label = computed(() => {
  if (!selected.value.length) return 'カテゴリを選んでください'
  if (all.value) return 'すべてのカテゴリをダウンロード'
  return `${selected.value.length}カテゴリをダウンロード`
})

const download = () => {
  const picked = categories.value.filter((c) => selected.value.includes(c.id))
  downloadCsv(buildCsv(picked, memosOf))
  notify('CSVをダウンロードしました')
  emit('done')
}
</script>

<template>
  <fieldset class="mm-csv">
    <legend class="mm-visually-hidden">ダウンロードするカテゴリ</legend>
    <v-checkbox
      v-model="all"
      :indeterminate="partial"
      label="すべてのカテゴリ"
      class="mm-csv__all"
    />
    <v-checkbox v-for="c in categories" :key="c.id" v-model="selected" :value="c.id" class="ms-4">
      <template #label>
        <span class="flex-grow-1">{{ c.name }}</span>
        <span class="text-body-small mm-sub ms-3">{{ memosOf(c.id).length }}件</span>
      </template>
    </v-checkbox>
  </fieldset>
  <v-btn
    class="mt-4"
    variant="flat"
    color="primary"
    :prepend-icon="iconDownload"
    :disabled="!selected.length"
    @click="download"
  >
    {{ label }}
  </v-btn>
</template>

<style scoped>
.mm-csv {
  border: none;
  margin: 0;
  padding: 0;
}
.mm-csv__all {
  border-bottom: 1px solid var(--mm-line-soft);
}
.mm-csv__all :deep(.v-label) {
  font-weight: 700;
}
.mm-csv :deep(.v-label) {
  width: 100%;
  opacity: 1;
}
</style>
