/**
 * Types of the API, taken from the backend's `AppType` through Hono RPC (no hand-written DTOs).
 * Times are UTC epoch milliseconds. Errors are `{ code, message }`, thrown as `ApiError`.
 */
import type { InferRequestType, InferResponseType } from 'hono/client'

import type { client } from './index.ts'

/** Response of `GET /api/sync`. `full`: every row; the client replaces its IndexedDB copy. */
export type SyncResponse = InferResponseType<typeof client.sync.$get, 200>
export type Category = SyncResponse['categories'][number]
export type Memo = SyncResponse['memos'][number]
/** Response of every write: the rows it changed, soft-deleted ones included. */
export type ChangedRows = InferResponseType<typeof client.categories.$post, 200>
export type Me = InferResponseType<typeof client.me.$get, 200>
export type MemoInput = InferRequestType<(typeof client.memos)[':id']['$patch']>['json']

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
