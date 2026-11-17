import type { CategoryDao, CategoryRecord } from '../dao/category.interface.ts'
import type { MemoDao, MemoRecord } from '../dao/memo.interface.ts'

export interface Category {
  id: string
  userId: string
  name: string
  sortOrder: number
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export interface Memo {
  id: string
  userId: string
  categoryId: string
  /** `null` when omitted. */
  keyword: string | null
  body: string
  sortOrder: number
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

/** Categories and the memos in them. Every read is scoped to one user. */
export interface NoteRepository {
  findLiveCategory: (userId: string, id: string) => Promise<Category | null>
  listLiveCategories: (userId: string) => Promise<Category[]>
  listCategoriesChangedSince: (userId: string, since: number) => Promise<Category[]>
  createCategory: (category: Category) => Promise<void>
  updateCategories: (categories: Category[]) => Promise<void>

  findLiveMemo: (userId: string, id: string) => Promise<Memo | null>
  listLiveMemos: (userId: string, categoryId: string) => Promise<Memo[]>
  /** Memos that aren't soft-deleted, in categories that aren't either. */
  listAllLiveMemos: (userId: string) => Promise<Memo[]>
  listMemosChangedSince: (userId: string, since: number) => Promise<Memo[]>
  createMemo: (memo: Memo) => Promise<void>
  updateMemos: (memos: Memo[]) => Promise<void>

  /** Hard-deletes categories (with their memos) and memos soft-deleted before `before`. */
  purgeDeletedBefore: (before: number) => Promise<void>
}

const toCategory = (r: CategoryRecord): Category => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
})
const fromCategory = (c: Category): CategoryRecord => ({
  id: c.id,
  user_id: c.userId,
  name: c.name,
  sort_order: c.sortOrder,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
  deleted_at: c.deletedAt,
})
const toMemo = (r: MemoRecord): Memo => ({
  id: r.id,
  userId: r.user_id,
  categoryId: r.category_id,
  keyword: r.keyword,
  body: r.body,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
})
const fromMemo = (m: Memo): MemoRecord => ({
  id: m.id,
  user_id: m.userId,
  category_id: m.categoryId,
  keyword: m.keyword,
  body: m.body,
  sort_order: m.sortOrder,
  created_at: m.createdAt,
  updated_at: m.updatedAt,
  deleted_at: m.deletedAt,
})

export const createNoteRepository = (
  categoryDao: CategoryDao,
  memoDao: MemoDao,
): NoteRepository => ({
  findLiveCategory: async (userId, id) => {
    const record = await categoryDao.findLive(userId, id)
    return record && toCategory(record)
  },
  listLiveCategories: async (userId) => (await categoryDao.listLive(userId)).map(toCategory),
  listCategoriesChangedSince: async (userId, since) =>
    (await categoryDao.listChangedSince(userId, since)).map(toCategory),
  createCategory: (c) => categoryDao.insert(fromCategory(c)),
  updateCategories: (cs) => categoryDao.update(cs.map(fromCategory)),

  findLiveMemo: async (userId, id) => {
    const record = await memoDao.findLive(userId, id)
    return record && toMemo(record)
  },
  listLiveMemos: async (userId, categoryId) =>
    (await memoDao.listLiveByCategory(userId, categoryId)).map(toMemo),
  listAllLiveMemos: async (userId) => (await memoDao.listLiveInLiveCategories(userId)).map(toMemo),
  listMemosChangedSince: async (userId, since) =>
    (await memoDao.listChangedSince(userId, since)).map(toMemo),
  createMemo: (m) => memoDao.insert(fromMemo(m)),
  updateMemos: (ms) => memoDao.update(ms.map(fromMemo)),

  purgeDeletedBefore: async (before) => {
    await categoryDao.purgeDeletedBefore(before)
    await memoDao.purgeDeletedBefore(before)
  },
})
