<script setup lang="ts">
import { computed } from 'vue'

import { installGuide } from '../composables/install.ts'

/** ブラウザがインストール画面を出せないとき（iOS など）の、手動での追加手順 */
const open = defineModel<boolean>({ required: true })

const guides = {
  ios: {
    lead: 'Safariで、次の手順でホーム画面に追加してください。',
    steps: [
      '画面下（iPadは右上）の共有ボタン（□に↑のアイコン）をタップします。',
      'メニューを下にスクロールし、「ホーム画面に追加」をタップします。',
      '右上の「追加」をタップします。',
    ],
    note: 'Safari以外のブラウザでも、共有ボタンから追加できる場合があります。',
  },
  'mac-safari': {
    lead: 'Safariで、次の手順でDockに追加してください。',
    steps: ['メニューバーの「ファイル」をクリックします。', '「Dockに追加」をクリックします。'],
    note: '',
  },
  android: {
    lead: 'ブラウザのメニューから、次の手順で追加してください。',
    steps: [
      '画面右上（または下）のメニュー（︙ や ≡）を開きます。',
      '「アプリをインストール」または「ホーム画面に追加」をタップします。',
    ],
    note: '',
  },
  desktop: {
    lead: 'ChromeまたはEdgeで、次の手順でインストールしてください。',
    steps: [
      'アドレスバーの右端にあるインストールのアイコンをクリックします。',
      '見当たらない場合は、メニュー（︙ や …）から「アプリ」または「キャスト、保存、共有」を開き、「インストール」をクリックします。',
    ],
    note: 'Firefoxはアプリのインストールに対応していません。',
  },
}
const guide = computed(() => guides[installGuide()])
</script>

<template>
  <v-dialog v-model="open" max-width="440">
    <v-card class="pa-2">
      <v-card-title class="text-title-large font-weight-bold">アプリをインストール</v-card-title>
      <v-card-text>
        <p class="text-body-medium mb-3">{{ guide.lead }}</p>
        <ol class="mm-steps text-body-medium">
          <li v-for="step in guide.steps" :key="step">{{ step }}</li>
        </ol>
        <p v-if="guide.note" class="text-body-small mm-sub mt-3">{{ guide.note }}</p>
      </v-card-text>
      <v-card-actions class="px-4 pb-3">
        <v-spacer />
        <v-btn variant="flat" color="primary" @click="open = false">閉じる</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.mm-steps {
  padding-left: 1.4em;
  line-height: 1.8;
}
.mm-steps li + li {
  margin-top: 6px;
}
</style>
