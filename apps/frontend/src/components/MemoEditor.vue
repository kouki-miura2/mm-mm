<script setup lang="ts">
import { charLength, LIMITS } from 'utils'
import { computed, ref, watch } from 'vue'

import type { Memo } from '../api/types.ts'
import { confirm } from '../composables/confirm.ts'
import { iconClose, iconCopy, iconDelete } from '../icons.ts'
import { createMemo, deleteMemo, updateMemo } from '../stores/data.ts'
import { copyMemo } from '../stores/memo-clipboard.ts'
import { messageFor, notify } from '../stores/notify.ts'
import { formatDateTime } from '../utils/datetime.ts'
import { displayKeyword } from '../utils/search.ts'

/**
 * メモの登録・変更フォーム。
 * page: スマホの全画面 / dialog: タブレットのダイアログ / panel: PCの右側パネル
 */
const props = defineProps<{
  memo: Memo | null
  categoryId: string
  variant: 'page' | 'dialog' | 'panel'
}>()
const emit = defineEmits<{ close: []; saved: [id: string]; deleted: [] }>()

const keyword = ref('')
const body = ref('')
const keywordError = ref('')
const bodyError = ref('')
const saving = ref(false)

const reset = () => {
  keyword.value = props.memo?.keyword ?? ''
  body.value = props.memo?.body ?? ''
  keywordError.value = ''
  bodyError.value = ''
}
watch(() => props.memo?.id, reset, { immediate: true })

const isNew = computed(() => !props.memo)
const dirty = computed(
  () => keyword.value !== (props.memo?.keyword ?? '') || body.value !== (props.memo?.body ?? ''),
)

/** 編集中の内容があれば、破棄してよいか確認する */
const confirmDiscard = async () => {
  if (!dirty.value) return true
  return confirm({
    title: '編集中の内容を破棄しますか？',
    text: '保存していない変更は失われます。',
    okText: '破棄する',
    danger: true,
  })
}

const close = async () => {
  if (await confirmDiscard()) emit('close')
}

const save = async () => {
  keywordError.value =
    charLength(keyword.value.trim()) > LIMITS.keywordMaxLength
      ? `キーワードは${LIMITS.keywordMaxLength}文字以内で入力してください`
      : ''
  bodyError.value = !body.value.trim()
    ? 'メモを入力してください'
    : charLength(body.value) > LIMITS.memoBodyMaxLength
      ? `メモは${LIMITS.memoBodyMaxLength}文字以内で入力してください`
      : ''
  if (keywordError.value || bodyError.value) return
  saving.value = true
  try {
    const input = { keyword: keyword.value.trim() || null, body: body.value }
    const rows = props.memo
      ? await updateMemo(props.memo.id, input)
      : await createMemo(props.categoryId, input)
    notify(isNew.value ? 'メモを追加しました' : 'メモを保存しました')
    const id = rows.memos[0]?.id
    if (id) emit('saved', id)
  } catch (err) {
    notify(
      messageFor(err, `メモは1カテゴリにつき${LIMITS.memosPerCategory}件まで登録できます。`),
      true,
    )
  } finally {
    saving.value = false
  }
}

const remove = async () => {
  if (!props.memo) return
  const ok = await confirm({
    title: 'メモを削除しますか？',
    text: `「${displayKeyword(props.memo).text}」を削除します。削除したメモは一覧に表示されなくなります。`,
    okText: '削除する',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteMemo(props.memo.id)
    notify('メモを削除しました')
    emit('deleted')
  } catch (err) {
    notify(messageFor(err), true)
  }
}

/** 保存済みの内容をコピーする（編集中の変更は含めない） */
const copy = () => {
  if (!props.memo) return
  copyMemo(props.memo)
  notify('メモをコピーしました。貼り付け先のカテゴリを開いてください。')
}

defineExpose({ confirmDiscard })
</script>

<template>
  <section
    class="mm-editor"
    :class="`mm-editor--${variant}`"
    :aria-label="isNew ? 'メモを追加' : 'メモを編集'"
  >
    <header class="mm-editor__head">
      <template v-if="variant === 'panel'">
        <h2 class="text-title-medium font-weight-bold flex-grow-1">
          {{ isNew ? 'メモを追加' : 'メモを編集' }}
        </h2>
        <v-btn :icon="iconClose" variant="text" aria-label="閉じる" @click="close" />
      </template>
      <template v-else>
        <v-btn :icon="iconClose" variant="text" aria-label="編集をやめる" @click="close" />
        <h2 class="text-title-medium font-weight-bold flex-grow-1">
          {{ isNew ? 'メモを追加' : 'メモを編集' }}
        </h2>
        <v-btn variant="flat" color="primary" :loading="saving" @click="save">保存</v-btn>
      </template>
    </header>

    <v-form class="mm-editor__body" @submit.prevent="save">
      <v-text-field
        v-model="keyword"
        label="キーワード（任意）"
        hint="省略すると、メモ本文の先頭が一覧に表示されます。"
        persistent-hint
        :autofocus="isNew"
        :counter="LIMITS.keywordMaxLength"
        :counter-value="charLength"
        :error-messages="keywordError"
        @update:model-value="keywordError = ''"
      />
      <v-textarea
        v-model="body"
        label="メモ"
        :rows="variant === 'panel' ? 12 : 9"
        :auto-grow="variant !== 'panel'"
        :class="{ 'mm-fill': variant === 'panel' }"
        :counter="LIMITS.memoBodyMaxLength"
        :counter-value="charLength"
        :error-messages="bodyError"
        @update:model-value="bodyError = ''"
      />
      <div v-if="memo" class="d-flex flex-wrap mm-meta text-body-small mm-sub">
        <span>作成 {{ formatDateTime(memo.createdAt) }}</span>
        <span>更新 {{ formatDateTime(memo.updatedAt) }}</span>
      </div>
      <div v-if="memo && variant !== 'panel'" class="d-flex flex-wrap ga-2 mt-2">
        <v-btn variant="text" :prepend-icon="iconCopy" @click="copy">他のカテゴリにコピー</v-btn>
        <v-btn variant="text" color="error" :prepend-icon="iconDelete" @click="remove">
          このメモを削除
        </v-btn>
      </div>
    </v-form>

    <footer v-if="variant === 'panel'" class="mm-editor__foot">
      <!-- パネルは幅が狭いため、削除・コピーはアイコンだけにする -->
      <template v-if="memo">
        <v-btn
          title="削除"
          :icon="iconDelete"
          variant="text"
          color="error"
          aria-label="削除"
          @click="remove"
        />
        <v-btn
          title="他のカテゴリにコピー"
          :icon="iconCopy"
          variant="text"
          aria-label="他のカテゴリにコピー"
          @click="copy"
        />
      </template>
      <v-spacer />
      <v-btn variant="outlined" @click="close">キャンセル</v-btn>
      <v-btn variant="flat" color="primary" :loading="saving" @click="save">保存</v-btn>
    </footer>
  </section>
</template>

<style scoped>
.mm-editor {
  display: flex;
  flex-direction: column;
  background: #fff;
  height: 100%;
  min-height: 0;
}
.mm-editor__head {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 60px;
  flex-shrink: 0;
  padding: 0 12px 0 4px;
  border-bottom: 1px solid var(--mm-line);
}
.mm-editor--panel .mm-editor__head {
  padding: 0 12px 0 24px;
}
.mm-editor__body {
  flex-grow: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 16px;
}
.mm-editor--panel .mm-editor__body {
  padding: 20px 24px;
}
/* v-input は既定で flex-grow するため、本文欄以外は伸ばさない */
.mm-editor__body > :deep(.v-input) {
  flex: 0 0 auto;
}
.mm-editor__body > :deep(.v-input.mm-fill) {
  flex: 1 1 auto;
}
.mm-meta {
  column-gap: 16px;
}
.mm-editor__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-top: 1px solid var(--mm-line-soft);
}
.mm-fill {
  flex-grow: 1;
}
.mm-fill :deep(.v-input__control),
.mm-fill :deep(.v-field) {
  height: 100%;
}
</style>
