<script setup lang="ts">
import { LIMITS } from 'utils'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import type { Memo } from '../api/types.ts'
import MemoDetailDialog from '../components/MemoDetailDialog.vue'
import MemoEditor from '../components/MemoEditor.vue'
import MemoList1Col from '../components/MemoList1Col.vue'
import MemoList2Col from '../components/MemoList2Col.vue'
import MemoReorderList from '../components/MemoReorderList.vue'
import { confirm } from '../composables/confirm.ts'
import { useLayout } from '../composables/layout.ts'
import { iconAdd, iconBack, iconClose, iconPaste, iconSearch } from '../icons.ts'
import { categories, createMemo, data, deleteMemo, memosOf, reorderMemos } from '../stores/data.ts'
import { clearCopiedMemo, copiedMemo, copyMemo } from '../stores/memo-clipboard.ts'
import { messageFor, notify } from '../stores/notify.ts'
import { memoColumns } from '../stores/prefs.ts'
import { filterMemos, displayKeyword } from '../utils/search.ts'

const props = defineProps<{ categoryId: string }>()
const router = useRouter()
const { isWide, isDesktop } = useLayout()

const category = computed(() => categories.value.find((c) => c.id === props.categoryId) ?? null)
const all = computed(() => memosOf(props.categoryId))
const query = ref('')
const results = computed(() => filterMemos(all.value, query.value))
const editing = ref(false)
const canAdd = computed(() => all.value.length < LIMITS.memosPerCategory)

/** 表示形式。端末ごとに保存し、未設定ならスマホは1カラム、それ以外は2カラム */
const columns = computed<1 | 2>({
  get: () => memoColumns.value ?? (isWide.value ? 2 : 1),
  set: (v) => (memoColumns.value = v),
})

const detail = reactive({ open: false, memo: null as Memo | null })
const editor = reactive({ open: false, memo: null as Memo | null })
const editorRef = ref<InstanceType<typeof MemoEditor> | null>(null)
const usePanel = computed(() => isDesktop.value)

// カテゴリを切り替えたら状態を戻す
watch(
  () => props.categoryId,
  () => {
    query.value = ''
    editing.value = false
    detail.open = false
    editor.open = false
  },
)

// 削除されたカテゴリ・存在しないカテゴリはホームへ
watch(
  () => [data.loaded, category.value] as const,
  ([loaded, c]) => {
    if (loaded && !c && !data.syncing) void router.replace('/')
  },
  { immediate: true },
)

// 一覧の行が更新されたら、開いている詳細も最新にする
watch(all, (list) => {
  if (detail.memo) detail.memo = list.find((m) => m.id === detail.memo!.id) ?? null
  if (!detail.memo) detail.open = false
})

const openEditor = async (memo: Memo | null) => {
  if (editor.open && editorRef.value && !(await editorRef.value.confirmDiscard())) return
  detail.open = false
  editor.memo = memo
  editor.open = true
}

const openMemo = (memo: Memo) => {
  // 2カラム表示ではメモ本文が見えているので、タブレット・PCは直接編集を開く
  if (columns.value === 2 && isWide.value) void openEditor(memo)
  else {
    detail.memo = memo
    detail.open = true
  }
}

const onSaved = (id: string) => {
  if (usePanel.value) {
    editor.memo = all.value.find((m) => m.id === id) ?? null
  } else {
    editor.open = false
  }
}

const closeEditor = () => {
  editor.open = false
}

const removeMemo = async (memo: Memo) => {
  const ok = await confirm({
    title: 'メモを削除しますか？',
    text: `「${displayKeyword(memo).text}」を削除します。削除したメモは一覧に表示されなくなります。`,
    okText: '削除する',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteMemo(memo.id)
    notify('メモを削除しました')
    detail.open = false
    if (editor.memo?.id === memo.id) editor.open = false
  } catch (err) {
    notify(messageFor(err), true)
  }
}

const onReorder = async (ids: string[]) => {
  try {
    await reorderMemos(props.categoryId, ids)
  } catch (err) {
    notify(messageFor(err), true)
  }
}

const addMemo = () => {
  if (!canAdd.value) {
    notify(`メモは1カテゴリにつき${LIMITS.memosPerCategory}件まで登録できます。`, true)
    return
  }
  void openEditor(null)
}

const copiedLabel = computed(() => (copiedMemo.value ? displayKeyword(copiedMemo.value).text : ''))
const pasting = ref(false)

const onCopy = (memo: Memo) => {
  copyMemo(memo)
  detail.open = false
  notify('メモをコピーしました。貼り付け先のカテゴリを開いてください。')
}

/** コピーしたメモを、このカテゴリに新しいメモとして追加する */
const paste = async () => {
  if (!copiedMemo.value) return
  if (!canAdd.value) {
    notify(`メモは1カテゴリにつき${LIMITS.memosPerCategory}件まで登録できます。`, true)
    return
  }
  pasting.value = true
  try {
    await createMemo(props.categoryId, copiedMemo.value)
    notify(`「${category.value?.name}」に貼り付けました`)
  } catch (err) {
    notify(
      messageFor(err, `メモは1カテゴリにつき${LIMITS.memosPerCategory}件まで登録できます。`),
      true,
    )
  } finally {
    pasting.value = false
  }
}

const countText = computed(() =>
  query.value.trim()
    ? `検索結果 ${results.value.length}件`
    : `${all.value.length} / ${LIMITS.memosPerCategory} 件`,
)
</script>

<template>
  <div v-if="category" class="mm-cat" :class="{ 'mm-cat--wide': isWide }">
    <!-- スマホ: 上部のバー -->
    <v-app-bar v-if="!isWide" flat color="surface" height="56">
      <v-btn :icon="iconBack" variant="text" to="/" aria-label="カテゴリ一覧に戻る" />
      <v-app-bar-title class="text-title-large font-weight-bold ms-1">{{
        category.name
      }}</v-app-bar-title>
      <template #append>
        <v-btn variant="text" color="primary" :disabled="!all.length" @click="editing = !editing">
          {{ editing ? '完了' : '並び替え' }}
        </v-btn>
      </template>
    </v-app-bar>

    <div class="mm-cat__main">
      <!-- タブレット・PC: 見出しと操作 -->
      <div v-if="isWide" class="d-flex align-center flex-wrap ga-3 mb-4">
        <div class="d-flex align-baseline ga-3 flex-grow-1 mm-ellipsis">
          <h1 class="text-headline-small font-weight-bold mm-ellipsis">{{ category.name }}</h1>
          <span v-if="editing" class="mm-badge">並び替え・削除</span>
          <span v-else class="text-body-medium mm-sub">{{ countText }}</span>
        </div>
        <template v-if="editing">
          <v-btn variant="flat" color="primary" @click="editing = false">完了</v-btn>
        </template>
        <template v-else>
          <v-btn-toggle
            v-model="columns"
            mandatory
            density="comfortable"
            color="primary"
            variant="flat"
            border
            divided
            rounded="lg"
            aria-label="表示形式"
          >
            <v-btn :value="1" :rounded="false">1カラム</v-btn>
            <v-btn :value="2" :rounded="false">2カラム</v-btn>
          </v-btn-toggle>
          <v-btn variant="outlined" :disabled="!all.length" @click="editing = true">並び替え</v-btn>
          <v-btn
            variant="flat"
            color="primary"
            :prepend-icon="iconAdd"
            :disabled="!canAdd"
            @click="addMemo"
          >
            メモを追加
          </v-btn>
        </template>
      </div>

      <p v-if="editing" class="text-body-medium mm-sub mb-3 px-1">
        ハンドルをドラッグして並び替えます。並び順はすぐに保存されます。
      </p>

      <!-- 検索と表示形式 -->
      <div v-if="!editing" :class="isWide ? 'mb-4' : 'mm-cat__tools'">
        <!-- クリアボタンは値を null にするため、空文字に戻す -->
        <v-text-field
          :model-value="query"
          :prepend-inner-icon="iconSearch"
          label="キーワード・メモを検索"
          variant="solo-filled"
          flat
          single-line
          clearable
          hide-details
          density="comfortable"
          rounded="lg"
          type="search"
          @update:model-value="(v: string | null) => (query = v ?? '')"
        />
        <div v-if="!isWide" class="d-flex align-center justify-space-between mt-3">
          <span class="text-body-medium mm-sub">{{ countText }}</span>
          <v-btn-toggle
            v-model="columns"
            mandatory
            density="compact"
            color="primary"
            variant="flat"
            border
            divided
            rounded="lg"
            aria-label="表示形式"
          >
            <v-btn :value="1" :rounded="false" size="small">1カラム</v-btn>
            <v-btn :value="2" :rounded="false" size="small">2カラム</v-btn>
          </v-btn-toggle>
        </div>
      </div>

      <!-- コピーしたメモの貼り付け -->
      <div v-if="copiedMemo && !editing" class="mm-paste" :class="{ 'mx-4 mt-3 mb-0': !isWide }">
        <v-icon :icon="iconPaste" color="primary" />
        <span class="flex-grow-1 mm-ellipsis text-body-medium">
          コピー中：<span class="font-weight-medium">{{ copiedLabel }}</span>
        </span>
        <v-btn variant="flat" color="primary" size="small" :loading="pasting" @click="paste">
          ここに貼り付け
        </v-btn>
        <v-btn
          :icon="iconClose"
          variant="text"
          size="small"
          aria-label="コピーを取り消す"
          @click="clearCopiedMemo"
        />
      </div>

      <!-- 一覧 -->
      <div :class="{ 'mm-cat__list': !isWide }">
        <MemoReorderList
          v-if="editing"
          :memos="all"
          :compact="!isWide"
          @reorder="onReorder"
          @remove="removeMemo"
        />
        <template v-else-if="results.length">
          <MemoList2Col
            v-if="columns === 2"
            :memos="results"
            :query="query"
            :selected-id="usePanel && editor.open ? editor.memo?.id : null"
            @open="openMemo"
          />
          <MemoList1Col v-else :memos="results" :query="query" @open="openMemo" />
        </template>
        <div v-else class="mm-empty">
          <template v-if="query.trim()">「{{ query.trim() }}」に一致するメモはありません</template>
          <template v-else>
            <p class="mb-3">メモはまだありません</p>
            <v-btn variant="tonal" color="primary" :prepend-icon="iconAdd" @click="addMemo"
              >メモを追加</v-btn
            >
          </template>
        </div>
      </div>
    </div>

    <!-- PC: 右側の編集パネル -->
    <aside v-if="usePanel && editor.open" class="mm-cat__panel">
      <MemoEditor
        ref="editorRef"
        :memo="editor.memo"
        :category-id="categoryId"
        variant="panel"
        @close="closeEditor"
        @saved="onSaved"
        @deleted="closeEditor"
      />
    </aside>

    <!-- スマホ: 追加ボタン -->
    <v-btn
      v-if="!isWide && !editing"
      class="mm-fab"
      color="primary"
      size="large"
      rounded="xl"
      :prepend-icon="iconAdd"
      :disabled="!canAdd"
      @click="addMemo"
    >
      メモを追加
    </v-btn>

    <MemoDetailDialog
      v-model="detail.open"
      :memo="detail.memo"
      :query="query"
      @edit="openEditor"
      @remove="removeMemo"
      @copy="onCopy"
    />

    <!-- スマホ・タブレット: 編集はダイアログ（スマホは全画面） -->
    <v-dialog
      v-if="!usePanel"
      :model-value="editor.open"
      :fullscreen="!isWide"
      max-width="640"
      persistent
      scrollable
    >
      <v-card :rounded="isWide ? 'xl' : 0" class="mm-editor-card">
        <MemoEditor
          ref="editorRef"
          :memo="editor.memo"
          :category-id="categoryId"
          :variant="isWide ? 'dialog' : 'page'"
          @close="closeEditor"
          @saved="onSaved"
          @deleted="closeEditor"
        />
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.mm-paste {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 6px 6px 6px 14px;
  border: 1px solid rgb(var(--v-theme-primary));
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.06);
}
.mm-cat {
  min-height: 100%;
}
.mm-cat--wide {
  display: flex;
  align-items: flex-start;
}
.mm-cat__main {
  flex-grow: 1;
  min-width: 0;
}
.mm-cat--wide .mm-cat__main {
  padding: 20px 24px 32px;
}
.mm-cat__tools {
  position: sticky;
  top: var(--v-layout-top, 56px);
  z-index: 2;
  background: #fff;
  padding: 4px 16px 12px;
  border-bottom: 1px solid var(--mm-line);
}
.mm-cat__list {
  padding: 12px 16px 104px;
}
.mm-cat__panel {
  position: sticky;
  top: var(--v-layout-top, 0px);
  width: 400px;
  flex-shrink: 0;
  height: calc(100dvh - var(--v-layout-top, 0px));
  border-left: 1px solid var(--mm-line);
}
.mm-editor-card {
  height: 100%;
}
.mm-fab {
  position: fixed;
  right: 16px;
  bottom: calc(24px + env(safe-area-inset-bottom));
  z-index: 5;
  height: 56px !important;
  box-shadow: 0 6px 16px rgba(47, 91, 211, 0.32);
}
.mm-badge {
  font-size: 12px;
  font-weight: 700;
  color: rgb(var(--v-theme-primary-darken-1));
  background: var(--mm-accent-soft);
  border-radius: 6px;
  padding: 3px 8px;
}
.mm-empty {
  padding: 48px 16px;
  text-align: center;
  color: var(--mm-sub);
}
</style>
