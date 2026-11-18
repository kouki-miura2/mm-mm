<script setup lang="ts">
import { LIMITS } from 'utils'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import CsvExport from '../components/CsvExport.vue'
import InstallGuideDialog from '../components/InstallGuideDialog.vue'
import { confirm } from '../composables/confirm.ts'
import { canPromptInstall, isInstalled, promptInstall } from '../composables/install.ts'
import { useLayout } from '../composables/layout.ts'
import { isOnline } from '../composables/online.ts'
import { iconBack, iconChevron, iconDownload, iconInstall } from '../icons.ts'
import { categories, memosOf } from '../stores/data.ts'
import { messageFor, notify } from '../stores/notify.ts'
import { logout, withdraw } from '../stores/session.ts'

const router = useRouter()
const { isWide } = useLayout()
const csvOpen = ref(false)
const installGuideOpen = ref(false)
const version = __APP_VERSION__

const barWidth = (n: number) => `${Math.max(2, (n / LIMITS.memosPerCategory) * 100)}%`

/** ブラウザがインストール画面を出せればそれを使い、出せなければ手順を表示する */
const onInstall = async () => {
  if (!canPromptInstall.value) {
    installGuideOpen.value = true
    return
  }
  if ((await promptInstall()) === 'accepted') notify('アプリをインストールしました')
}

const onLogout = async () => {
  try {
    await logout()
  } finally {
    void router.replace('/login')
  }
}

const onWithdraw = async () => {
  const ok = await confirm({
    title: '退会しますか？',
    text: 'すべてのカテゴリとメモを完全に削除します。元に戻すことはできません。',
    okText: '退会する',
    danger: true,
  })
  if (!ok) return
  if (!isOnline.value) {
    notify('オフラインのため退会できません。オンラインに戻ってからお試しください。', true)
    return
  }
  try {
    await withdraw()
    notify('退会しました。ご利用ありがとうございました。')
    void router.replace('/login')
  } catch (err) {
    notify(messageFor(err), true)
  }
}
</script>

<template>
  <v-app-bar v-if="!isWide" flat color="surface" height="56" border="b">
    <v-btn :icon="iconBack" variant="text" to="/" aria-label="戻る" />
    <v-app-bar-title class="text-title-large font-weight-bold ms-1">設定</v-app-bar-title>
  </v-app-bar>

  <div class="mm-settings" :class="{ 'mm-settings--wide': isWide }">
    <h1 v-if="isWide" class="text-headline-small font-weight-bold mb-5">設定</h1>

    <div class="mm-settings__grid">
      <!-- 利用状況 -->
      <section class="mm-section">
        <h2 class="mm-section__title">利用状況</h2>
        <div class="mm-card pa-4">
          <div class="d-flex align-baseline ga-2 pb-3 mm-split">
            <span class="flex-grow-1 font-weight-medium">登録カテゴリ数</span>
            <strong class="text-headline-small font-weight-bold">{{ categories.length }}</strong>
            <span class="mm-sub">/ {{ LIMITS.categoriesPerUser }}</span>
          </div>
          <p class="text-body-medium mm-sub pt-3 pb-1">
            カテゴリごとのメモ数（上限 {{ LIMITS.memosPerCategory }}）
          </p>
          <div v-for="c in categories" :key="c.id" class="mm-usage">
            <span class="mm-ellipsis">{{ c.name }}</span>
            <div class="mm-bar">
              <div class="mm-bar__fill" :style="{ width: barWidth(memosOf(c.id).length) }" />
            </div>
            <span class="text-right mm-sub"
              >{{ memosOf(c.id).length }} / {{ LIMITS.memosPerCategory }}</span
            >
          </div>
          <p v-if="!categories.length" class="mm-sub text-body-medium pt-2">
            カテゴリはまだありません
          </p>
        </div>
      </section>

      <!-- CSVダウンロード -->
      <section class="mm-section">
        <h2 class="mm-section__title">データ</h2>
        <div v-if="isWide" class="mm-card pa-4">
          <p class="font-weight-bold mb-1">CSVダウンロード</p>
          <p class="text-body-medium mm-sub mb-2">
            選んだカテゴリのキーワードとメモ本文を、CSV形式でダウンロードします。
          </p>
          <CsvExport />
        </div>
        <div v-else class="mm-card">
          <button type="button" class="mm-link-row" @click="csvOpen = true">
            <v-icon :icon="iconDownload" color="primary" />
            <span class="flex-grow-1 d-flex flex-column">
              <span class="font-weight-medium">CSVダウンロード</span>
              <span class="text-body-small mm-sub"
                >カテゴリを選んで、キーワードとメモを書き出す</span
              >
            </span>
            <v-icon :icon="iconChevron" color="#8A919C" />
          </button>
        </div>
      </section>

      <!-- このアプリについて -->
      <section class="mm-section">
        <h2 class="mm-section__title">このアプリについて</h2>
        <div class="mm-card">
          <button
            v-if="!isInstalled"
            type="button"
            class="mm-link-row mm-row-line"
            @click="onInstall"
          >
            <v-icon :icon="iconInstall" color="primary" />
            <span class="flex-grow-1 d-flex flex-column">
              <span class="font-weight-medium">アプリをインストール</span>
              <span class="text-body-small mm-sub">ホーム画面から全画面で開けます</span>
            </span>
            <v-icon :icon="iconChevron" color="#8A919C" />
          </button>
          <router-link to="/terms" class="mm-link-row mm-row-line">
            <span class="flex-grow-1">利用規約</span><v-icon :icon="iconChevron" color="#8A919C" />
          </router-link>
          <router-link to="/privacy" class="mm-link-row mm-row-line">
            <span class="flex-grow-1">プライバシーポリシー</span
            ><v-icon :icon="iconChevron" color="#8A919C" />
          </router-link>
          <div class="mm-link-row mm-row-line">
            <span class="flex-grow-1">アプリバージョン</span
            ><span class="mm-sub">{{ version }}</span>
          </div>
        </div>
      </section>

      <!-- アカウント -->
      <section class="mm-section">
        <h2 class="mm-section__title">アカウント</h2>
        <div class="mm-card">
          <button type="button" class="mm-link-row mm-row-line" @click="onLogout">
            ログアウト
          </button>
          <button type="button" class="mm-link-row mm-row-line" @click="onWithdraw">
            <span class="d-flex flex-column">
              <span class="font-weight-medium text-error">退会する</span>
              <span class="text-body-small mm-sub">すべてのカテゴリとメモを完全に削除します</span>
            </span>
          </button>
        </div>
      </section>
    </div>
  </div>

  <InstallGuideDialog v-model="installGuideOpen" />

  <v-dialog v-model="csvOpen" :fullscreen="!isWide" max-width="480" scrollable>
    <v-card :rounded="0">
      <v-toolbar color="surface" border="b" density="comfortable">
        <v-btn :icon="iconBack" variant="text" aria-label="戻る" @click="csvOpen = false" />
        <v-toolbar-title class="text-title-large font-weight-bold">CSVダウンロード</v-toolbar-title>
      </v-toolbar>
      <v-card-text class="pa-4">
        <p class="text-body-medium mm-sub mb-2">
          選んだカテゴリのキーワードとメモ本文を、CSV形式でダウンロードします。
        </p>
        <CsvExport @done="csvOpen = false" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.mm-settings {
  padding: 16px 16px 40px;
}
.mm-settings--wide {
  max-width: 1000px;
  margin: 0 auto;
  padding: 28px 32px 48px;
}
.mm-settings__grid {
  display: grid;
  gap: 20px;
}
.mm-settings--wide .mm-settings__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
}
.mm-section__title {
  font-size: 13px;
  font-weight: 500;
  color: #4a515c;
  margin: 0 4px 8px;
}
.mm-split {
  border-bottom: 1px solid var(--mm-line-soft);
}
.mm-usage {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) 72px;
  align-items: center;
  gap: 12px;
  padding-top: 10px;
  font-size: 14px;
}
.mm-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--mm-line-soft);
  overflow: hidden;
}
.mm-bar__fill {
  height: 100%;
  border-radius: 3px;
  background: rgb(var(--v-theme-primary));
}
.mm-link-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 52px;
  padding: 8px 12px 8px 16px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 15px;
  color: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}
div.mm-link-row {
  cursor: default;
}
button.mm-link-row:hover,
a.mm-link-row:hover {
  background: #f7f8fa;
}
</style>
