import { addMonths, charLength, LIMITS } from 'utils'

import type { Category, Memo, NoteRepository } from '../repository/note.repository.ts'
import { AppError } from './app-error.ts'

export type CategoryView = Omit<Category, 'userId'>
export type MemoView = Omit<Memo, 'userId'>

/** Response of every write: the rows it changed, soft-deleted ones included. */
export interface ChangedRows {
  categories: CategoryView[]
  memos: MemoView[]
}

export interface SyncResult extends ChangedRows {
  /** `true`: every row; the client replaces its copy. */
  full: boolean
  /** Sync time for the client to send as `since` next time. */
  syncedAt: number
}

export interface MemoInput {
  keyword: string | null
  body: string
}

export interface NoteService {
  /** Rows changed since `since`; every live row when it's `null` or older than the purge period. */
  sync: (userId: string, since: number | null) => Promise<SyncResult>
  createCategory: (userId: string, name: string) => Promise<ChangedRows>
  renameCategory: (userId: string, id: string, name: string) => Promise<ChangedRows>
  deleteCategory: (userId: string, id: string) => Promise<ChangedRows>
  reorderCategories: (userId: string, ids: string[]) => Promise<ChangedRows>
  createMemo: (userId: string, categoryId: string, input: MemoInput) => Promise<ChangedRows>
  updateMemo: (userId: string, id: string, input: MemoInput) => Promise<ChangedRows>
  deleteMemo: (userId: string, id: string) => Promise<ChangedRows>
  reorderMemos: (userId: string, categoryId: string, ids: string[]) => Promise<ChangedRows>
  /** Hard-deletes categories and memos soft-deleted longer ago than the retention period. */
  purgeDeleted: () => Promise<void>
}

const purgeBorder = (now: number) =>
  addMonths(new Date(now), -LIMITS.deletedRetentionMonths).getTime()

const strip = <T extends { userId: string }>(row: T): Omit<T, 'userId'> => {
  const { userId: _userId, ...view } = row
  return view
}

const rows = (categories: Category[] = [], memos: Memo[] = []): ChangedRows => ({
  categories: categories.map(strip),
  memos: memos.map(strip),
})

const nextSortOrder = (list: { sortOrder: number }[]) =>
  Math.max(-1, ...list.map((x) => x.sortOrder)) + 1

/** Gives the rows the order of `ids` and returns only those whose `sortOrder` changed. */
const reorder = <T extends { id: string; sortOrder: number; updatedAt: number }>(
  list: T[],
  ids: string[],
  now: number,
): T[] =>
  ids.flatMap((id, index) => {
    const row = list.find((x) => x.id === id)
    return row && row.sortOrder !== index ? [{ ...row, sortOrder: index, updatedAt: now }] : []
  })

const requireName = (name: string) => {
  const value = name.trim()
  if (!value) throw new AppError('validation', 'カテゴリ名を入力してください')
  if (charLength(value) > LIMITS.categoryNameMaxLength) {
    throw new AppError(
      'validation',
      `カテゴリ名は${LIMITS.categoryNameMaxLength}文字以内で入力してください`,
    )
  }
  return value
}

const normalizeMemo = (input: MemoInput) => {
  if (!input.body.trim()) throw new AppError('validation', 'メモを入力してください')
  if (charLength(input.body) > LIMITS.memoBodyMaxLength) {
    throw new AppError('validation', `メモは${LIMITS.memoBodyMaxLength}文字以内で入力してください`)
  }
  const keyword = input.keyword?.trim() || null
  if (keyword && charLength(keyword) > LIMITS.keywordMaxLength) {
    throw new AppError(
      'validation',
      `キーワードは${LIMITS.keywordMaxLength}文字以内で入力してください`,
    )
  }
  return { keyword, body: input.body }
}

export const createNoteService = (notes: NoteRepository): NoteService => {
  const liveCategory = async (userId: string, id: string) => {
    const category = await notes.findLiveCategory(userId, id)
    if (!category) throw new AppError('not_found')
    return category
  }

  /** A memo is gone too when its category is soft-deleted. */
  const liveMemo = async (userId: string, id: string) => {
    const memo = await notes.findLiveMemo(userId, id)
    if (!memo) throw new AppError('not_found')
    await liveCategory(userId, memo.categoryId)
    return memo
  }

  const saveCategory = async (category: Category) => {
    await notes.updateCategories([category])
    return rows([category])
  }

  const saveMemo = async (memo: Memo) => {
    await notes.updateMemos([memo])
    return rows([], [memo])
  }

  return {
    sync: async (userId, since) => {
      const now = Date.now()
      if (since === null || since < purgeBorder(now)) {
        const [categories, memos] = await Promise.all([
          notes.listLiveCategories(userId),
          notes.listAllLiveMemos(userId),
        ])
        return { full: true, ...rows(categories, memos), syncedAt: now }
      }
      const [categories, memos] = await Promise.all([
        notes.listCategoriesChangedSince(userId, since),
        notes.listMemosChangedSince(userId, since),
      ])
      return { full: false, ...rows(categories, memos), syncedAt: now }
    },

    createCategory: async (userId, name) => {
      const live = await notes.listLiveCategories(userId)
      if (live.length >= LIMITS.categoriesPerUser) throw new AppError('limit_exceeded')
      const now = Date.now()
      const category: Category = {
        id: crypto.randomUUID(),
        userId,
        name: requireName(name),
        sortOrder: nextSortOrder(live),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }
      await notes.createCategory(category)
      return rows([category])
    },

    renameCategory: async (userId, id, name) => {
      const category = await liveCategory(userId, id)
      return saveCategory({ ...category, name: requireName(name), updatedAt: Date.now() })
    },

    // The memos keep `deleted_at` unset ("削除・件数の扱い"); they're hidden with their category.
    deleteCategory: async (userId, id) => {
      const category = await liveCategory(userId, id)
      const now = Date.now()
      return saveCategory({ ...category, deletedAt: now, updatedAt: now })
    },

    reorderCategories: async (userId, ids) => {
      const changed = reorder(await notes.listLiveCategories(userId), ids, Date.now())
      if (changed.length) await notes.updateCategories(changed)
      return rows(changed)
    },

    createMemo: async (userId, categoryId, input) => {
      await liveCategory(userId, categoryId)
      const live = await notes.listLiveMemos(userId, categoryId)
      if (live.length >= LIMITS.memosPerCategory) throw new AppError('limit_exceeded')
      const now = Date.now()
      const memo: Memo = {
        id: crypto.randomUUID(),
        userId,
        categoryId,
        ...normalizeMemo(input),
        sortOrder: nextSortOrder(live),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }
      await notes.createMemo(memo)
      return rows([], [memo])
    },

    updateMemo: async (userId, id, input) => {
      const memo = await liveMemo(userId, id)
      return saveMemo({ ...memo, ...normalizeMemo(input), updatedAt: Date.now() })
    },

    deleteMemo: async (userId, id) => {
      const memo = await liveMemo(userId, id)
      const now = Date.now()
      return saveMemo({ ...memo, deletedAt: now, updatedAt: now })
    },

    reorderMemos: async (userId, categoryId, ids) => {
      await liveCategory(userId, categoryId)
      const changed = reorder(await notes.listLiveMemos(userId, categoryId), ids, Date.now())
      if (changed.length) await notes.updateMemos(changed)
      return rows([], changed)
    },

    purgeDeleted: () => notes.purgeDeletedBefore(purgeBorder(Date.now())),
  }
}
