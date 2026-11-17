import { expect, test } from 'vite-plus/test'
import { createMemoryHistory, createRouter } from 'vue-router'

import { routes } from './routes.ts'

const resolve = (path: string) =>
  createRouter({ history: createMemoryHistory(), routes }).resolve(path)

test.each([
  ['/', 'home'],
  ['/login', 'login'],
  ['/agree', 'agree'],
  ['/settings', 'settings'],
  ['/terms', 'terms'],
  ['/privacy', 'privacy'],
])('resolves %s to the %s route', (path, name) => {
  expect(resolve(path).name).toBe(name)
})

test('passes the category id from the path', () => {
  const resolved = resolve('/c/abc')

  expect(resolved.name).toBe('category')
  expect(resolved.params.categoryId).toBe('abc')
})

test('redirects an unknown path to home', () => {
  // `resolve()` doesn't follow redirects: check the catch-all route that matched.
  expect(resolve('/does-not-exist').matched[0]?.redirect).toBe('/')
})
