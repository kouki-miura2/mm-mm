import { addMonths, LIMITS } from 'utils'
/**
 * カテゴリ・メモの状態。表示は IndexedDB の複製から行い、更新はオンライン時だけ API に送る。
 * 成功した結果（変更された行）を IndexedDB と画面に反映する。同時更新はあと勝ち。
 */
import { computed, reactive } from 'vue'

import { api, ApiError, type MemoInput } from '../api/index.ts'
import type { Category, ChangedRows, Memo } from '../api/types.ts'
import { isOnline } from '../composables/online.ts'
import * as idb from '../db/idb.ts'

export const data = reactive({
  categories: [] as Category[],
  memos: [] as Memo[],
  syncedAt: null as number | null,
  syncing: false,
  loaded: false,
})

let onUnauthorized: () => void = () => {}
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn)

const bySort = <T extends { sortOrder: number; createdAt: number }>(a: T, b: T) =>
  a.sortOrder - b.sortOrder || a.createdAt - b.createdAt

export const categories = computed(() => [...data.categories].sort(bySort))

export const memosByCategory = computed(() => {
  const map = new Map<string, Memo[]>()
  for (const m of data.memos) {
    const list = map.get(m.categoryId)
    if (list) list.push(m)
    else map.set(m.categoryId, [m])
  }
  for (const list of map.values()) list.sort(bySort)
  return map
})

export const memosOf = (categoryId: string) => memosByCategory.value.get(categoryId) ?? []

export const canAddCategory = computed(() => data.categories.length < LIMITS.categoriesPerUser)

export const loadLocal = async () => {
  const snap = await idb.loadSnapshot()
  data.categories = snap.categories
  data.memos = snap.memos
  data.syncedAt = snap.syncedAt
  data.loaded = true
  return snap
}

const mergeRows = (rows: ChangedRows) => {
  for (const c of rows.categories) {
    const i = data.categories.findIndex((x) => x.id === c.id)
    if (c.deletedAt !== null) {
      if (i >= 0) data.categories.splice(i, 1)
      data.memos = data.memos.filter((m) => m.categoryId !== c.id)
    } else if (i >= 0) data.categories[i] = c
    else data.categories.push(c)
  }
  for (const m of rows.memos) {
    const i = data.memos.findIndex((x) => x.id === m.id)
    if (m.deletedAt !== null) {
      if (i >= 0) data.memos.splice(i, 1)
    } else if (i >= 0) data.memos[i] = m
    else data.memos.push(m)
  }
}

/**
 * D1 → IndexedDB の同期。前回の同期時刻以降の差分だけを取得する。
 * 初回、または前回が物理削除までの期間より古い場合は全件を取得して置き換える。
 */
export const sync = async (): Promise<void> => {
  if (!isOnline.value || data.syncing) return
  data.syncing = true
  try {
    const border = addMonths(new Date(), -LIMITS.deletedRetentionMonths).getTime()
    const since = data.syncedAt !== null && data.syncedAt >= border ? data.syncedAt : null
    const res = await api.sync(since)
    if (res.full) {
      await idb.replaceAll(res, res.syncedAt)
      data.categories = res.categories.filter((c) => c.deletedAt === null)
      data.memos = res.memos.filter((m) => m.deletedAt === null)
    } else {
      await idb.applyRows(res, res.syncedAt)
      mergeRows(res)
    }
    data.syncedAt = res.syncedAt
  } catch (err) {
    if (err instanceof ApiError && err.code === 'unauthorized') onUnauthorized()
    // オフライン・一時的なエラーは次の機会に再同期する
  } finally {
    data.syncing = false
  }
}

/** 更新を API に送り、成功した結果を反映する。オフライン時は送らずにエラーにする */
const write = async (fn: () => Promise<ChangedRows>): Promise<ChangedRows> => {
  if (!isOnline.value) throw new ApiError('offline')
  try {
    const rows = await fn()
    await idb.applyRows(rows)
    mergeRows(rows)
    return rows
  } catch (err) {
    if (err instanceof ApiError && err.code === 'unauthorized') onUnauthorized()
    if (err instanceof ApiError && err.code === 'not_found') void sync()
    throw err
  }
}

export const createCategory = (name: string) => write(() => api.createCategory(name))
export const renameCategory = (id: string, name: string) =>
  write(() => api.renameCategory(id, name))
export const deleteCategory = (id: string) => write(() => api.deleteCategory(id))
export const createMemo = (categoryId: string, input: MemoInput) =>
  write(() => api.createMemo(categoryId, input))
export const updateMemo = (id: string, input: MemoInput) => write(() => api.updateMemo(id, input))
export const deleteMemo = (id: string) => write(() => api.deleteMemo(id))

/** 並び替えは画面に先に反映し、失敗したら元に戻す */
export const reorderCategories = async (ids: string[]) => {
  const before = data.categories.map((c) => ({ ...c }))
  ids.forEach((id, i) => {
    const c = data.categories.find((x) => x.id === id)
    if (c) c.sortOrder = i
  })
  try {
    await write(() => api.reorderCategories(ids))
  } catch (err) {
    data.categories = before
    throw err
  }
}

export const reorderMemos = async (categoryId: string, ids: string[]) => {
  const before = data.memos.map((m) => ({ ...m }))
  ids.forEach((id, i) => {
    const m = data.memos.find((x) => x.id === id)
    if (m) m.sortOrder = i
  })
  try {
    await write(() => api.reorderMemos(categoryId, ids))
  } catch (err) {
    data.memos = before
    throw err
  }
}

export const clearLocal = async () => {
  await idb.clearAll()
  data.categories = []
  data.memos = []
  data.syncedAt = null
}
