import { addMonths, LIMITS } from 'utils'
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test'

import { createMemoryDaos } from '../dao/memory.ts'
import { createNoteRepository } from '../repository/note.repository.ts'
import { createNoteService } from './note.service.ts'

// The repository over the in-memory DAOs serves as the fake: it holds state across calls, which
// these business rules (limits, ordering, soft delete, diff sync) need to be tested against.
const setup = () => {
  const { categoryDao, memoDao } = createMemoryDaos()
  return createNoteService(createNoteRepository(categoryDao, memoDao))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
})
afterEach(() => vi.useRealTimers())

test('creates categories in order, trimming the name and hiding userId', async () => {
  const service = setup()

  const { categories } = await service.createCategory('u1', '  Work ')
  await service.createCategory('u1', 'Home')

  expect(categories).toEqual([
    {
      id: expect.any(String),
      name: 'Work',
      sortOrder: 0,
      createdAt: 1_000_000,
      updatedAt: 1_000_000,
      deletedAt: null,
    },
  ])
  const sync = await service.sync('u1', null)
  expect(sync.categories.map((c) => [c.name, c.sortOrder])).toEqual([
    ['Work', 0],
    ['Home', 1],
  ])
})

test('rejects an empty name and categories over the limit', async () => {
  const service = setup()
  await expect(service.createCategory('u1', '  ')).rejects.toMatchObject({ code: 'validation' })

  for (let i = 0; i < LIMITS.categoriesPerUser; i++) await service.createCategory('u1', `c${i}`)
  await expect(service.createCategory('u1', 'one more')).rejects.toMatchObject({
    code: 'limit_exceeded',
  })
})

test('soft-deleted categories free their slot and hide their memos', async () => {
  const service = setup()
  const { categories } = await service.createCategory('u1', 'Work')
  const id = categories[0]!.id
  await service.createMemo('u1', id, { keyword: null, body: 'memo' })

  const deleted = await service.deleteCategory('u1', id)

  expect(deleted.categories[0]!.deletedAt).toBe(1_000_000)
  await expect(service.sync('u1', null)).resolves.toMatchObject({ categories: [], memos: [] })
  await expect(service.renameCategory('u1', id, 'x')).rejects.toMatchObject({ code: 'not_found' })
  await expect(service.createMemo('u1', id, { keyword: null, body: 'memo' })).rejects.toMatchObject(
    { code: 'not_found' },
  )
})

test("other users' rows are not found", async () => {
  const service = setup()
  const { categories } = await service.createCategory('u1', 'Work')
  const { memos } = await service.createMemo('u1', categories[0]!.id, { keyword: 'k', body: 'b' })

  await expect(service.renameCategory('u2', categories[0]!.id, 'x')).rejects.toMatchObject({
    code: 'not_found',
  })
  await expect(service.deleteMemo('u2', memos[0]!.id)).rejects.toMatchObject({
    code: 'not_found',
  })
})

test('normalizes memo input and requires a body', async () => {
  const service = setup()
  const { categories } = await service.createCategory('u1', 'Work')
  const categoryId = categories[0]!.id

  const { memos } = await service.createMemo('u1', categoryId, { keyword: '  ', body: 'body ' })
  expect(memos[0]).toMatchObject({ categoryId, keyword: null, body: 'body ', sortOrder: 0 })

  await expect(
    service.updateMemo('u1', memos[0]!.id, { keyword: ' k ', body: ' ' }),
  ).rejects.toMatchObject({ code: 'validation' })
  const updated = await service.updateMemo('u1', memos[0]!.id, { keyword: ' k ', body: 'new' })
  expect(updated.memos[0]).toMatchObject({ keyword: 'k', body: 'new' })
})

test('reorder writes and returns only the rows whose order changed', async () => {
  const service = setup()
  const ids: string[] = []
  for (const name of ['a', 'b', 'c']) {
    ids.push((await service.createCategory('u1', name)).categories[0]!.id)
  }
  vi.setSystemTime(2_000_000)

  const { categories } = await service.reorderCategories('u1', [ids[0]!, ids[2]!, ids[1]!])

  expect(categories.map((c) => [c.name, c.sortOrder, c.updatedAt])).toEqual([
    ['c', 1, 2_000_000],
    ['b', 2, 2_000_000],
  ])
})

test('diff sync returns rows changed since, including soft-deleted ones', async () => {
  const service = setup()
  const { categories } = await service.createCategory('u1', 'Work')
  const { memos } = await service.createMemo('u1', categories[0]!.id, { keyword: null, body: 'b' })
  vi.setSystemTime(2_000_000)
  await service.deleteMemo('u1', memos[0]!.id)

  const sync = await service.sync('u1', 2_000_000)

  expect(sync).toMatchObject({ full: false, categories: [], syncedAt: 2_000_000 })
  expect(sync.memos.map((m) => m.deletedAt)).toEqual([2_000_000])
})

test('sync falls back to every row when since is older than the purge period', async () => {
  const service = setup()
  await service.createCategory('u1', 'Work')
  const now = Date.UTC(2026, 5, 15)
  vi.setSystemTime(now)
  const tooOld = addMonths(new Date(now), -LIMITS.deletedRetentionMonths).getTime() - 1

  await expect(service.sync('u1', tooOld)).resolves.toMatchObject({ full: true })
})

test('purges rows soft-deleted longer ago than the retention period', async () => {
  const service = setup()
  const { categories } = await service.createCategory('u1', 'Work')
  await service.deleteCategory('u1', categories[0]!.id)
  vi.setSystemTime(addMonths(new Date(1_000_000), LIMITS.deletedRetentionMonths).getTime() + 1)

  await service.purgeDeleted()

  await expect(service.sync('u1', 0)).resolves.toMatchObject({ categories: [] })
})
