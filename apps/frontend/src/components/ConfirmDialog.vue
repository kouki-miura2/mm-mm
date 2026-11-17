<script setup lang="ts">
import { confirmState, settleConfirm } from '../composables/confirm.ts'
</script>

<template>
  <v-dialog
    :model-value="confirmState.visible"
    max-width="440"
    @update:model-value="(v: boolean) => !v && settleConfirm(false)"
  >
    <v-card class="pa-2" role="alertdialog">
      <v-card-title class="text-title-large font-weight-bold text-wrap">{{
        confirmState.options.title
      }}</v-card-title>
      <v-card-text class="text-body-large mm-prewrap">{{ confirmState.options.text }}</v-card-text>
      <v-card-actions class="ga-2 px-4 pb-3">
        <v-spacer />
        <v-btn variant="outlined" @click="settleConfirm(false)">キャンセル</v-btn>
        <v-btn
          variant="flat"
          :color="confirmState.options.danger ? 'error' : 'primary'"
          @click="settleConfirm(true)"
        >
          {{ confirmState.options.okText ?? 'OK' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
