<script setup lang="ts">
import { LIMITS } from 'utils'
import { ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'

import AppLogo from '../components/AppLogo.vue'
import CategoryList from '../components/CategoryList.vue'
import SyncStatus from '../components/SyncStatus.vue'
import { useLayout } from '../composables/layout.ts'
import { iconAdd, iconSettings } from '../icons.ts'
import { canAddCategory, categories, data } from '../stores/data.ts'

const router = useRouter()
const { isWide } = useLayout()
const editing = ref(false)
const list = ref<InstanceType<typeof CategoryList> | null>(null)

// タブレット・PCは先頭のカテゴリを開く（カテゴリはサイドバーに表示している）
watchEffect(() => {
  const first = categories.value[0]
  if (isWide.value && data.loaded && first) void router.replace(`/c/${first.id}`)
})
</script>

<template>
  <!-- タブレット・PC: カテゴリがないとき -->
  <div v-if="isWide" class="mm-home-empty">
    <h1 class="text-title-large font-weight-bold mb-2">カテゴリを追加しましょう</h1>
    <p class="mm-sub">
      メモを管理したい単位でカテゴリを作り、その中にキーワードとメモを登録します。
    </p>
    <p class="mm-sub mt-1">左の「カテゴリを追加」から始められます。</p>
  </div>

  <!-- スマホ: カテゴリ一覧 -->
  <template v-else>
    <v-app-bar flat color="surface" height="56" border="b">
      <div class="px-4"><AppLogo :size="22" /></div>
      <template #append>
        <v-btn
          variant="text"
          color="primary"
          :disabled="!categories.length"
          @click="editing = !editing"
        >
          {{ editing ? '完了' : '並び替え' }}
        </v-btn>
        <v-btn :icon="iconSettings" variant="text" to="/settings" aria-label="設定" />
      </template>
    </v-app-bar>

    <div class="pa-4 pb-28">
      <div class="d-flex align-end justify-space-between mb-3 px-1">
        <div class="d-flex flex-column ga-1">
          <h1 class="text-headline-small font-weight-bold">カテゴリ</h1>
          <SyncStatus />
        </div>
        <span class="text-body-medium mm-sub"
          >{{ categories.length }} / {{ LIMITS.categoriesPerUser }}</span
        >
      </div>
      <CategoryList ref="list" v-model:editing="editing" variant="page" />
    </div>

    <v-btn
      v-if="!editing"
      class="mm-fab"
      color="primary"
      size="large"
      rounded="xl"
      :prepend-icon="iconAdd"
      :disabled="!canAddCategory"
      @click="list?.openCreate()"
    >
      カテゴリを追加
    </v-btn>
  </template>
</template>

<style scoped>
.pb-28 {
  padding-bottom: 112px !important;
}
.mm-home-empty {
  max-width: 520px;
  margin: 96px auto;
  padding: 0 24px;
  text-align: center;
}
.mm-fab {
  position: fixed;
  right: 16px;
  bottom: calc(24px + env(safe-area-inset-bottom));
  z-index: 5;
  height: 56px !important;
  box-shadow: 0 6px 16px rgba(47, 91, 211, 0.32);
}
</style>
