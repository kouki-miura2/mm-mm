import { createRouter, createWebHistory } from 'vue-router'

import { initSession, needsReagree, session } from '../stores/session.ts'
import { routes } from './routes.ts'

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  await initSession()
  if (to.meta.public) return true
  if (session.status !== 'authed') return to.meta.guest ? true : '/login'
  if (to.meta.guest) return '/'
  // 利用規約・プライバシーポリシーの改定時は、アプリの使用開始前に同意する
  if (needsReagree.value && to.path !== '/agree') return '/agree'
  if (!needsReagree.value && to.path === '/agree') return '/'
  return true
})
