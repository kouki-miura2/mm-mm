import { expect, test } from 'vite-plus/test'

import type { CategoryRecord } from './category.interface.ts'
import type { MemoRecord } from './memo.interface.ts'
import { createMemoryDaos } from './memory.ts'

const category = (id: string, over: Partial<CategoryRecord> = {}): CategoryRecord => ({
  id,
  user_id: 'u1',
  name: id,
  sort_order: 0,
  created_at: 1,
  updated_at: 1,
  deleted_at: null,
  ...over,
})
const memo = (id: string, categoryId: string, over: Partial<MemoRecord> = {}): MemoRecord => ({
  id,
  user_id: 'u1',
  category_id: categoryId,
  keyword: null,
  body: id,
  sort_order: 0,
  created_at: 1,
  updated_at: 1,
  deleted_at: null,
  ...over,
})

test('sessions resolve with their user, and expire', async () => {
  const { userDao, sessionDao } = createMemoryDaos()
  await userDao.insert({
    id: 'u1',
    google_sub: 'sub',
    terms_version: 'v1',
    terms_agreed_at: 1,
    created_at: 1,
  })
  await sessionDao.insert({ token_hash: 'h', user_id: 'u1', expires_at: 100, created_at: 1 })

  await expect(sessionDao.findWithUser('h')).resolves.toEqual({
    user_id: 'u1',
    expires_at: 100,
    terms_version: 'v1',
  })
  await sessionDao.deleteExpired(100)
  await expect(sessionDao.findWithUser('h')).resolves.toBeNull()
})

test('live lists skip soft-deleted rows and memos of soft-deleted categories', async () => {
  const { categoryDao, memoDao } = createMemoryDaos()
  await categoryDao.insert(category('c1'))
  await categoryDao.insert(category('c2', { deleted_at: 5 }))
  await memoDao.insert(memo('m1', 'c1'))
  await memoDao.insert(memo('m2', 'c1', { deleted_at: 5 }))
  await memoDao.insert(memo('m3', 'c2'))
  await memoDao.insert(memo('m4', 'c1', { user_id: 'other' }))

  expect((await categoryDao.listLive('u1')).map((c) => c.id)).toEqual(['c1'])
  expect((await memoDao.listLiveInLiveCategories('u1')).map((m) => m.id)).toEqual(['m1'])
  expect((await memoDao.listLiveByCategory('u1', 'c1')).map((m) => m.id)).toEqual(['m1'])
  await expect(memoDao.findLive('u1', 'm4')).resolves.toBeNull()
})

test('listChangedSince includes soft-deleted rows', async () => {
  const { categoryDao } = createMemoryDaos()
  await categoryDao.insert(category('old', { updated_at: 1 }))
  await categoryDao.insert(category('new', { updated_at: 10, deleted_at: 10 }))

  expect((await categoryDao.listChangedSince('u1', 10)).map((c) => c.id)).toEqual(['new'])
})

test('purging a category also removes its memos', async () => {
  const { categoryDao, memoDao } = createMemoryDaos()
  await categoryDao.insert(category('c1', { deleted_at: 5 }))
  await categoryDao.insert(category('c2'))
  await memoDao.insert(memo('m1', 'c1'))
  await memoDao.insert(memo('m2', 'c2', { deleted_at: 5 }))
  await memoDao.insert(memo('m3', 'c2', { deleted_at: 50 }))

  await categoryDao.purgeDeletedBefore(10)
  await memoDao.purgeDeletedBefore(10)

  expect((await categoryDao.listChangedSince('u1', 0)).map((c) => c.id)).toEqual(['c2'])
  expect((await memoDao.listChangedSince('u1', 0)).map((m) => m.id)).toEqual(['m3'])
})

test('deleteWithData removes everything of the user', async () => {
  const { userDao, sessionDao, categoryDao, memoDao } = createMemoryDaos()
  await userDao.insert({
    id: 'u1',
    google_sub: 'sub',
    terms_version: 'v1',
    terms_agreed_at: 1,
    created_at: 1,
  })
  await sessionDao.insert({ token_hash: 'h', user_id: 'u1', expires_at: 100, created_at: 1 })
  await categoryDao.insert(category('c1'))
  await memoDao.insert(memo('m1', 'c1'))

  await userDao.deleteWithData('u1')

  await expect(userDao.findById('u1')).resolves.toBeNull()
  await expect(sessionDao.findWithUser('h')).resolves.toBeNull()
  await expect(categoryDao.listChangedSince('u1', 0)).resolves.toEqual([])
  await expect(memoDao.listChangedSince('u1', 0)).resolves.toEqual([])
})
