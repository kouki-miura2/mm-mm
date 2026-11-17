/**
 * The contract between the screens and the API (`/api`, Hono on Cloudflare Workers). Hand-written
 * only while the backend doesn't exist and `mock.ts` stands in for it: once it does, these types
 * come from the backend's `AppType` through Hono RPC instead (see the root AGENTS.md).
 *
 * Authentication is a session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`). Times are UTC epoch
 * milliseconds. Writes return `ChangedRows` (the rows they changed). Errors are `{ code, message }`.
 */

export interface Category {
  id: string
  name: string
  sortOrder: number
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export interface Memo {
  id: string
  categoryId: string
  /** `null` when omitted: the screen shows the head of the body in its place. */
  keyword: string | null
  body: string
  sortOrder: number
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export interface Me {
  userId: string
  /** Version of the terms of service and privacy policy the user agreed to. */
  termsVersion: string
  termsAgreedAt: number
}

/** Response of `GET /api/sync`. */
export interface SyncResponse {
  /** `true`: every row; the client replaces its IndexedDB copy. */
  full: boolean
  categories: Category[]
  memos: Memo[]
  /** Sync time to send as `since` next time. */
  syncedAt: number
}

/** Response of every write: the rows it changed, soft-deleted ones included. */
export interface ChangedRows {
  categories: Category[]
  memos: Memo[]
}

export type ApiErrorCode =
  | 'unauthorized'
  | 'terms_not_agreed'
  | 'limit_exceeded'
  | 'not_found'
  | 'validation'
  | 'offline'
  | 'unknown'

export class ApiError extends Error {
  readonly code: ApiErrorCode

  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'ApiError'
    this.code = code
  }
}

export interface MemoInput {
  keyword: string | null
  body: string
}

export interface Api {
  /** `GET /me`. `unauthorized` when signed out or the session has expired. */
  me: () => Promise<Me>
  /**
   * `POST /auth/google` `{ idToken, termsVersion }`. Registers a new user only with the version
   * they agreed to; `terms_not_agreed` (403) for a new user when it's `null`.
   */
  loginWithGoogle: (idToken: string, termsVersion: string | null) => Promise<Me>
  /** `POST /auth/logout` (204). */
  logout: () => Promise<void>
  /** `POST /me/terms` `{ termsVersion }`: agrees to revised terms. */
  agreeTerms: (termsVersion: string) => Promise<Me>
  /** `GET /sync?since=`: rows changed since `since`; every row when it's `null` or too old. */
  sync: (since: number | null) => Promise<SyncResponse>

  /** `POST /categories` `{ name }`. */
  createCategory: (name: string) => Promise<ChangedRows>
  /** `PATCH /categories/:id` `{ name }`. */
  renameCategory: (id: string, name: string) => Promise<ChangedRows>
  /** `DELETE /categories/:id` (soft delete). */
  deleteCategory: (id: string) => Promise<ChangedRows>
  /** `PUT /categories/order` `{ ids }`: returns only the rows whose order changed. */
  reorderCategories: (ids: string[]) => Promise<ChangedRows>

  /** `POST /categories/:id/memos` `{ keyword, body }`. */
  createMemo: (categoryId: string, input: MemoInput) => Promise<ChangedRows>
  /** `PATCH /memos/:id` `{ keyword, body }`. */
  updateMemo: (id: string, input: MemoInput) => Promise<ChangedRows>
  /** `DELETE /memos/:id` (soft delete). */
  deleteMemo: (id: string) => Promise<ChangedRows>
  /** `PUT /categories/:id/memos/order` `{ ids }`. */
  reorderMemos: (categoryId: string, ids: string[]) => Promise<ChangedRows>

  /** `DELETE /me` (204): withdraws, hard-deleting all of the user's categories and memos. */
  withdraw: () => Promise<void>
}
