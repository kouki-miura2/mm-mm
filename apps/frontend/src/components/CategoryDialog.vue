<script setup lang="ts">
import { LIMITS } from 'utils'
import { ref, watch } from 'vue'

import type { Category } from '../api/types.ts'
import { createCategory, renameCategory } from '../stores/data.ts'
import { messageFor, notify } from '../stores/notify.ts'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{ category: Category | null }>()
const emit = defineEmits<{ saved: [id: string] }>()

const name = ref('')
const error = ref('')
const saving = ref(false)

watch(open, (v) => {
  if (!v) return
  name.value = props.category?.name ?? ''
  error.value = ''
})

const save = async () => {
  if (!name.value.trim()) {
    error.value = 'カテゴリ名を入力してください'
    return
  }
  saving.value = true
  try {
    const rows = props.category
      ? await renameCategory(props.category.id, name.value)
      : await createCategory(name.value)
    open.value = false
    notify(props.category ? 'カテゴリ名を変更しました' : 'カテゴリを追加しました')
    const id = rows.categories[0]?.id
    if (id) emit('saved', id)
  } catch (err) {
    notify(messageFor(err, `カテゴリは${LIMITS.categoriesPerUser}件まで登録できます。`), true)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="440">
    <v-card class="pa-2">
      <v-card-title class="text-title-large font-weight-bold">
        {{ category ? 'カテゴリ名を変更' : 'カテゴリを追加' }}
      </v-card-title>
      <v-card-text>
        <v-form @submit.prevent="save">
          <v-text-field
            v-model="name"
            label="カテゴリ名"
            autofocus
            :error-messages="error"
            @update:model-value="error = ''"
          />
        </v-form>
      </v-card-text>
      <v-card-actions class="ga-2 px-4 pb-3">
        <v-spacer />
        <v-btn variant="outlined" @click="open = false">キャンセル</v-btn>
        <v-btn variant="flat" color="primary" :loading="saving" @click="save">
          {{ category ? '変更' : '追加' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
