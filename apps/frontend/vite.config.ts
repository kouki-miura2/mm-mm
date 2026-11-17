import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import vuetify from 'vite-plugin-vuetify'
import { defineConfig } from 'vite-plus'

import rootPackage from '../../package.json' with { type: 'json' }

export default defineConfig({
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
  },
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    // Service worker: detects a new build and waits for the person to tap "更新"
    // (`registerType: 'prompt'`, `usePwaUpdate`). `/api` is never cached. Off in `vp dev`.
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'MmMm',
        short_name: 'MmMm',
        description: 'カテゴリごとにメモを登録・管理するツール',
        lang: 'ja',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#FFFFFF',
        background_color: '#F4F5F7',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The font is split into many files by character range: cache the ones used, not all.
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        // The SPA fallback must not answer the API.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.woff2'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(rootPackage.version),
  },
  // Dev only. Vuetify's auto-imported components are added at transform time, so Vite's dependency
  // scan can't see them; pre-bundling them lazily would re-optimize and reload the page on the
  // first visit to a lazy route that uses a new component (the navigation seems to do nothing).
  // Serving vuetify unbundled avoids that reload.
  optimizeDeps: {
    exclude: ['vuetify'],
  },
  // Same layout as production: frontend at `/`, backend at `/api` (backend dev server on 8787).
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
})
