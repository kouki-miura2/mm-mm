/** Raw `categories` row. */
export interface CategoryRecord {
  id: string
  user_id: string
  name: string
  sort_order: number
  created_at: number
  updated_at: number
  deleted_at: number | null
}

export interface CategoryDao {
  /** A category of the user that isn't soft-deleted. */
  findLive: (userId: string, id: string) => Promise<CategoryRecord | null>
  /** The user's categories that aren't soft-deleted. */
  listLive: (userId: string) => Promise<CategoryRecord[]>
  /** The user's categories with `updated_at >= since`, soft-deleted ones included. */
  listChangedSince: (userId: string, since: number) => Promise<CategoryRecord[]>
  insert: (record: CategoryRecord) => Promise<void>
  /** Writes `name`, `sort_order`, `updated_at` and `deleted_at` of each row, in one batch. */
  update: (records: CategoryRecord[]) => Promise<void>
  /** Hard-deletes categories soft-deleted before `before`, with all of their memos. */
  purgeDeletedBefore: (before: number) => Promise<void>
}
