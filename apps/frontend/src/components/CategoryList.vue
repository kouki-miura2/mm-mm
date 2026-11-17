<script setup lang="ts">
import { LIMITS } from 'utils'
import { ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useRoute, useRouter } from 'vue-router'

import type { Category } from '../api/types.ts'
import { confirm } from '../composables/confirm.ts'
import {
  iconAdd,
  iconChevron,
  iconDelete,
  iconDrag,
  iconEdit,
  iconFolder,
  iconMore,
} from '../icons.ts'
import {
  canAddCategory,
  categories,
  deleteCategory,
  memosOf,
  reorderCategories,
} from '../stores/data.ts'
import { messageFor, notify } from '../stores/notify.ts'
import CategoryDialog from './CategoryDialog.vue'

/** nav: タブレット・PCのサイドバー / page: スマホのカテゴリ一覧画面 */
const props = defineProps<{ variant: 'nav' | 'page' }>()
/** 編集モード（表示順の変更・名前の変更・削除） */
const editing = defineModel<boolean>('editing', { default: false })

const route = useRoute()
const router = useRouter()

const ordered = ref<Category[]>([])
watch(
  [categories, editing],
  () => {
    ordered.value = [...categories.value]
  },
  { immediate: true },
)

const dialogOpen = ref(false)
const target = ref<Category | null>(null)

const openCreate = () => {
  if (!canAddCategory.value) {
    notify(`カテゴリは${LIMITS.categoriesPerUser}件まで登録できます。`, true)
    return
  }
  target.value = null
  dialogOpen.value = true
}

const openRename = (c: Category) => {
  target.value = c
  dialogOpen.value = true
}

const onSaved = (id: string) => {
  if (!target.value) void router.push(`/c/${id}`)
}

const onReorder = async () => {
  try {
    await reorderCategories(ordered.value.map((c) => c.id))
  } catch (err) {
    notify(messageFor(err), true)
    ordered.value = [...categories.value]
  }
}

const remove = async (c: Category) => {
  const count = memosOf(c.id).length
  const ok = await confirm({
    title: 'カテゴリを削除しますか？',
    text: count
      ? `「${c.name}」と、含まれるメモ${count}件を削除します。`
      : `「${c.name}」を削除します。`,
    okText: '削除する',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteCategory(c.id)
    notify('カテゴリを削除しました')
    if (route.params.categoryId === c.id) void router.replace('/')
  } catch (err) {
    notify(messageFor(err), true)
  }
}

defineExpose({ openCreate })
const isNav = props.variant === 'nav'
</script>

<template>
  <div class="mm-cats" :class="`mm-cats--${variant}`">
    <div v-if="isNav" class="d-flex align-center justify-space-between px-2 pb-1">
      <span class="text-label-large mm-sub"
        >カテゴリ {{ categories.length }} / {{ LIMITS.categoriesPerUser }}</span
      >
      <v-btn size="small" variant="text" color="primary" @click="editing = !editing">
        {{ editing ? '完了' : '並び替え' }}
      </v-btn>
    </div>

    <!-- 編集モード -->
    <div v-if="editing" :class="isNav ? '' : 'mm-card'">
      <p v-if="!isNav" class="mm-sub text-body-small px-4 pt-3 pb-1">
        ハンドルをドラッグして並び替えます。
      </p>
      <VueDraggable
        v-model="ordered"
        handle=".mm-grip"
        :animation="150"
        ghost-class="mm-ghost"
        @end="onReorder"
      >
        <div
          v-for="c in ordered"
          :key="c.id"
          class="mm-edit-row"
          :class="{ 'mm-row-line': !isNav }"
        >
          <span class="mm-grip" aria-hidden="true"><v-icon :icon="iconDrag" size="20" /></span>
          <span class="mm-ellipsis flex-grow-1">{{ c.name }}</span>
          <v-menu location="bottom end">
            <template #activator="{ props: menu }">
              <v-btn
                v-bind="menu"
                :icon="iconMore"
                variant="text"
                size="small"
                :aria-label="`${c.name}の操作`"
              />
            </template>
            <v-list density="compact" bg-color="surface">
              <v-list-item :prepend-icon="iconEdit" title="名前を変更" @click="openRename(c)" />
              <v-list-item
                :prepend-icon="iconDelete"
                title="削除"
                base-color="error"
                @click="remove(c)"
              />
            </v-list>
          </v-menu>
        </div>
      </VueDraggable>
    </div>

    <!-- サイドバー -->
    <v-list v-else-if="isNav" nav density="comfortable" class="pa-0">
      <v-list-item
        v-for="c in categories"
        :key="c.id"
        :to="`/c/${c.id}`"
        rounded="lg"
        color="primary"
        :title="c.name"
      >
        <template #append>
          <span class="text-body-small mm-sub">{{ memosOf(c.id).length }}</span>
        </template>
      </v-list-item>
    </v-list>

    <!-- スマホの一覧 -->
    <div v-else class="mm-card">
      <router-link
        v-for="c in categories"
        :key="c.id"
        :to="`/c/${c.id}`"
        class="mm-page-row mm-row-line"
      >
        <span class="mm-folder"><v-icon :icon="iconFolder" size="20" /></span>
        <span class="mm-ellipsis flex-grow-1 text-body-large font-weight-medium">{{ c.name }}</span>
        <span class="text-body-medium mm-sub">{{ memosOf(c.id).length }}件</span>
        <v-icon :icon="iconChevron" size="20" color="#8A919C" />
      </router-link>
      <p v-if="!categories.length" class="pa-6 text-center mm-sub">カテゴリはまだありません</p>
    </div>

    <template v-if="isNav">
      <v-btn
        block
        variant="outlined"
        color="primary"
        class="mt-2 mm-dashed"
        :prepend-icon="iconAdd"
        :disabled="!canAddCategory"
        @click="openCreate"
      >
        カテゴリを追加
      </v-btn>
      <p v-if="!canAddCategory" class="text-body-small mm-sub px-2 pt-1">
        上限の{{ LIMITS.categoriesPerUser }}件に達しています
      </p>
    </template>

    <CategoryDialog v-model="dialogOpen" :category="target" @saved="onSaved" />
  </div>
</template>

<style scoped>
.mm-edit-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 48px;
  padding: 0 4px;
  background: #fff;
  border-radius: 10px;
}
.mm-cats--page .mm-edit-row {
  min-height: 60px;
  border-radius: 0;
  padding: 0 8px 0 4px;
}
.mm-grip {
  width: 40px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a919c;
  cursor: grab;
  touch-action: none;
}
.mm-ghost {
  opacity: 0.4;
  background: var(--mm-accent-soft);
}
.mm-page-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 64px;
  padding: 0 12px 0 14px;
  color: inherit;
  text-decoration: none;
}
.mm-page-row:hover {
  background: #f7f8fa;
}
.mm-folder {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--mm-accent-soft);
  color: rgb(var(--v-theme-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.mm-cats--nav :deep(.v-list-item-title) {
  font-size: 15px;
  line-height: 1.5;
}
.mm-cats--nav :deep(.v-list-item--active .v-list-item-title) {
  font-weight: 700;
}
.mm-dashed {
  border-style: dashed;
}
</style>
