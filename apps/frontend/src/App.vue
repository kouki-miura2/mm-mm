<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppLogo from './components/AppLogo.vue'
import AppSnackbars from './components/AppSnackbars.vue'
import CategoryList from './components/CategoryList.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import SyncStatus from './components/SyncStatus.vue'
import { useLayout } from './composables/layout.ts'
import { isOnline } from './composables/online.ts'
import { iconOffline, iconSettings } from './icons.ts'
import { session } from './stores/session.ts'

const route = useRoute()
const router = useRouter()
const { isWide, isDesktop } = useLayout()

const showShell = computed(() => session.status === 'authed' && !!route.meta.shell && isWide.value)

// セッションが切れたらログイン画面へ
watch(
  () => session.status,
  (status) => {
    if (status === 'guest' && !route.meta.guest && !route.meta.public) void router.replace('/login')
  },
)
</script>

<template>
  <v-app>
    <v-system-bar
      v-if="!isOnline"
      color="#3A3F47"
      height="36"
      class="justify-start px-4"
      role="status"
    >
      <v-icon :icon="iconOffline" size="18" class="me-2" />
      <span class="text-body-medium">オフラインです。閲覧のみできます。</span>
    </v-system-bar>

    <template v-if="showShell">
      <v-app-bar v-if="isDesktop" flat height="56" border="b" color="surface">
        <div class="d-flex align-center w-100 px-6 ga-4">
          <router-link to="/" class="text-decoration-none" aria-label="ホーム"
            ><AppLogo :size="22"
          /></router-link>
          <v-spacer />
          <SyncStatus />
          <v-btn
            :icon="iconSettings"
            variant="text"
            to="/settings"
            aria-label="設定"
            rounded="circle"
          />
        </div>
      </v-app-bar>

      <v-navigation-drawer permanent :width="isDesktop ? 260 : 280" color="surface">
        <div class="d-flex flex-column h-100 pa-3">
          <div v-if="!isDesktop" class="px-2 pt-2 pb-4"><AppLogo :size="24" /></div>
          <CategoryList variant="nav" />
          <v-spacer />
          <template v-if="!isDesktop">
            <SyncStatus class="px-2 pb-2" />
            <v-list density="comfortable" nav class="pa-0">
              <v-list-item to="/settings" :prepend-icon="iconSettings" title="設定" rounded="lg" />
            </v-list>
          </template>
        </div>
      </v-navigation-drawer>
    </template>

    <v-main>
      <router-view />
    </v-main>

    <ConfirmDialog />
    <AppSnackbars />
  </v-app>
</template>
