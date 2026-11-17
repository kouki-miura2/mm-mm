import type { RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** ログイン前だけ表示する */
    guest?: boolean
    /** ログインに関係なく表示する */
    public?: boolean
    /** タブレット・PCでカテゴリのサイドバーを表示する */
    shell?: boolean
  }
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { guest: true },
  },
  { path: '/agree', name: 'agree', component: () => import('../pages/AgreePage.vue') },
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/HomePage.vue'),
    meta: { shell: true },
  },
  {
    path: '/c/:categoryId',
    name: 'category',
    component: () => import('../pages/CategoryPage.vue'),
    props: true,
    meta: { shell: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../pages/SettingsPage.vue'),
    meta: { shell: true },
  },
  {
    path: '/terms',
    name: 'terms',
    component: () => import('../pages/LegalPage.vue'),
    props: { kind: 'terms' },
    meta: { public: true },
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('../pages/LegalPage.vue'),
    props: { kind: 'privacy' },
    meta: { public: true },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]
