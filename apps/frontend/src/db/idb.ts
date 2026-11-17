/**
 * カテゴリ・メモの複製と同期時刻をブラウザの IndexedDB に保持する。
 * 画面は常にここから表示し、D1 からは差分だけを取り込む（「同期（D1 → IndexedDB）」参照）。
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type { Category, ChangedRows, Memo } from '../api/types.ts'

interface MmmmDB extends DBSchema {
  categories: { key: string; value: Category }
  memos: { key: string; value: Memo; indexes: { byCategory: string } }
  meta: { key: string; value: string | number }
}

export interface Snapshot {
  categories: Category[]
  memos: Memo[]
  syncedAt: number | null
  userId: string | null
}

let dbp: Promise<IDBPDatabase<MmmmDB>> | null = null
const db = () =>
  (dbp ??= openDB<MmmmDB>('mmmm', 1, {
    upgrade(d) {
      d.createObjectStore('categories', { keyPath: 'id' })
      d.createObjectStore('memos', { keyPath: 'id' }).createIndex('byCategory', 'categoryId')
      d.createObjectStore('meta')
    },
  }))

export const loadSnapshot = async (): Promise<Snapshot> => {
  const d = await db()
  const [categories, memos, syncedAt, userId] = await Promise.all([
    d.getAll('categories'),
    d.getAll('memos'),
    d.get('meta', 'syncedAt'),
    d.get('meta', 'userId'),
  ])
  return {
    categories,
    memos,
    syncedAt: typeof syncedAt === 'number' ? syncedAt : null,
    userId: typeof userId === 'string' ? userId : null,
  }
}

/** 全件取得の結果で置き換える */
export const replaceAll = async (rows: ChangedRows, syncedAt: number) => {
  const d = await db()
  const tx = d.transaction(['categories', 'memos', 'meta'], 'readwrite')
  await Promise.all([tx.objectStore('categories').clear(), tx.objectStore('memos').clear()])
  await Promise.all([
    ...rows.categories
      .filter((c) => c.deletedAt === null)
      .map((c) => tx.objectStore('categories').put(c)),
    ...rows.memos.filter((m) => m.deletedAt === null).map((m) => tx.objectStore('memos').put(m)),
    tx.objectStore('meta').put(syncedAt, 'syncedAt'),
  ])
  await tx.done
}

/**
 * 変更された行を反映する。論理削除された行は複製から取り除く。
 * 論理削除されたカテゴリのメモは表示しないので、あわせて取り除く。
 */
export const applyRows = async (rows: ChangedRows, syncedAt?: number) => {
  const d = await db()
  const tx = d.transaction(['categories', 'memos', 'meta'], 'readwrite')
  const cats = tx.objectStore('categories')
  const memos = tx.objectStore('memos')
  for (const c of rows.categories) {
    if (c.deletedAt === null) {
      await cats.put(c)
    } else {
      await cats.delete(c.id)
      for (const key of await memos.index('byCategory').getAllKeys(c.id)) await memos.delete(key)
    }
  }
  for (const m of rows.memos) {
    if (m.deletedAt === null) await memos.put(m)
    else await memos.delete(m.id)
  }
  if (syncedAt !== undefined) await tx.objectStore('meta').put(syncedAt, 'syncedAt')
  await tx.done
}

export const setUserId = async (userId: string) => {
  await (await db()).put('meta', userId, 'userId')
}

/** ログアウト・退会時に削除する */
export const clearAll = async () => {
  const d = await db()
  const tx = d.transaction(['categories', 'memos', 'meta'], 'readwrite')
  await Promise.all([
    tx.objectStore('categories').clear(),
    tx.objectStore('memos').clear(),
    tx.objectStore('meta').clear(),
  ])
  await tx.done
}
