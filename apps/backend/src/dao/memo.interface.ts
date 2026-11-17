/** Raw `memos` row. */
export interface MemoRecord {
  id: string
  user_id: string
  category_id: string
  keyword: string | null
  body: string
  sort_order: number
  created_at: number
  updated_at: number
  deleted_at: number | null
}

export interface MemoDao {
  /** A memo of the user that isn't soft-deleted. Its category may be. */
  findLive: (userId: string, id: string) => Promise<MemoRecord | null>
  /** The memos of a category that aren't soft-deleted. */
  listLiveByCategory: (userId: string, categoryId: string) => Promise<MemoRecord[]>
  /** The user's memos that aren't soft-deleted, in categories that aren't soft-deleted either. */
  listLiveInLiveCategories: (userId: string) => Promise<MemoRecord[]>
  /** The user's memos with `updated_at >= since`, soft-deleted ones included. */
  listChangedSince: (userId: string, since: number) => Promise<MemoRecord[]>
  insert: (record: MemoRecord) => Promise<void>
  /** Writes `keyword`, `body`, `sort_order`, `updated_at` and `deleted_at` of each row, in one batch. */
  update: (records: MemoRecord[]) => Promise<void>
  /** Hard-deletes memos soft-deleted before `before`. */
  purgeDeletedBefore: (before: number) => Promise<void>
}
