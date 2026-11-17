import { expect, test, vi } from 'vite-plus/test'

import type { CategoryDao, CategoryRecord } from '../dao/category.interface.ts'
import type { MemoDao, MemoRecord } from '../dao/memo.interface.ts'
import { createNoteRepository } from './note.repository.ts'

const categoryRecord: CategoryRecord = {
  id: 'c1',
  user_id: 'u1',
  name: 'Name',
  sort_order: 2,
  created_at: 1,
  updated_at: 3,
  deleted_at: null,
}
const memoRecord: MemoRecord = {
  id: 'm1',
  user_id: 'u1',
  category_id: 'c1',
  keyword: null,
  body: 'Body',
  sort_order: 0,
  created_at: 1,
  updated_at: 3,
  deleted_at: 4,
}
const category = {
  id: 'c1',
  userId: 'u1',
  name: 'Name',
  sortOrder: 2,
  createdAt: 1,
  updatedAt: 3,
  deletedAt: null,
}
const memo = {
  id: 'm1',
  userId: 'u1',
  categoryId: 'c1',
  keyword: null,
  body: 'Body',
  sortOrder: 0,
  createdAt: 1,
  updatedAt: 3,
  deletedAt: 4,
}

const categoryDao: CategoryDao = {
  findLive: async () => categoryRecord,
  listLive: async () => [categoryRecord],
  listChangedSince: async () => [categoryRecord],
  insert: async () => {},
  update: vi.fn(async () => {}),
  purgeDeletedBefore: vi.fn(async () => {}),
}
const memoDao: MemoDao = {
  findLive: async () => null,
  listLiveByCategory: async () => [memoRecord],
  listLiveInLiveCategories: async () => [memoRecord],
  listChangedSince: async () => [memoRecord],
  insert: vi.fn(async () => {}),
  update: async () => {},
  purgeDeletedBefore: vi.fn(async () => {}),
}
const repository = createNoteRepository(categoryDao, memoDao)

test('maps category rows to and from the domain entity', async () => {
  await expect(repository.findLiveCategory('u1', 'c1')).resolves.toEqual(category)
  await expect(repository.listLiveCategories('u1')).resolves.toEqual([category])

  await repository.updateCategories([category])
  expect(categoryDao.update).toHaveBeenCalledWith([categoryRecord])
})

test('maps memo rows to and from the domain entity', async () => {
  await expect(repository.findLiveMemo('u1', 'm1')).resolves.toBeNull()
  await expect(repository.listMemosChangedSince('u1', 0)).resolves.toEqual([memo])

  await repository.createMemo(memo)
  expect(memoDao.insert).toHaveBeenCalledWith(memoRecord)
})

test('purges categories and memos', async () => {
  await repository.purgeDeletedBefore(10)

  expect(categoryDao.purgeDeletedBefore).toHaveBeenCalledWith(10)
  expect(memoDao.purgeDeletedBefore).toHaveBeenCalledWith(10)
})
