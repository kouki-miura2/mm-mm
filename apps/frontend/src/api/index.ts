/**
 * The API client: Hono RPC (`hc<AppType>()`) against `apps/backend`, on the same origin under
 * `/api`. Authentication is the `HttpOnly` session cookie, sent by the browser. Request and
 * response types come from the backend's `AppType` (see `types.ts`).
 */
import type { AppType } from 'backend/src/app.ts'
import { hc, type ClientResponse } from 'hono/client'

import { ApiError, type ApiErrorCode, type MemoInput } from './types.ts'

export { ApiError } from './types.ts'
export type { MemoInput } from './types.ts'

export const client = hc<AppType>('/').api

const CODES: ApiErrorCode[] = [
  'unauthorized',
  'terms_not_agreed',
  'limit_exceeded',
  'not_found',
  'validation',
]

/** Sends a request; an error response (`{ code, message }`) or no connection throws an `ApiError`. */
const send = async <T>(request: () => Promise<ClientResponse<T>>): Promise<T> => {
  if (!navigator.onLine) throw new ApiError('offline')
  let res: ClientResponse<T>
  try {
    res = await request()
  } catch {
    throw new ApiError('offline')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null
    const code = CODES.find((c) => c === body?.code) ?? 'unknown'
    throw new ApiError(code, body?.message)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

export const api = {
  me: () => send(() => client.me.$get()),
  /** Registers a new user only with the terms version they agreed to (`terms_not_agreed` otherwise). */
  loginWithGoogle: (idToken: string, termsVersion: string | null) =>
    send(() => client.auth.google.$post({ json: { idToken, termsVersion } })),
  /** Development login: the backend accepts it only when `wrangler dev` enables it. */
  loginForDevelopment: (name: string, termsVersion: string | null) =>
    send(() => client.auth.dev.$post({ json: { name, termsVersion } })),
  logout: async () => {
    await send(() => client.auth.logout.$post())
  },
  agreeTerms: (termsVersion: string) =>
    send(() => client.me.terms.$post({ json: { termsVersion } })),
  /** Rows changed since `since`; every row when it's `null` or too old. */
  sync: (since: number | null) =>
    send(() => client.sync.$get({ query: since === null ? {} : { since: String(since) } })),

  createCategory: (name: string) => send(() => client.categories.$post({ json: { name } })),
  renameCategory: (id: string, name: string) =>
    send(() => client.categories[':id'].$patch({ param: { id }, json: { name } })),
  deleteCategory: (id: string) => send(() => client.categories[':id'].$delete({ param: { id } })),
  /** Returns only the rows whose order changed. */
  reorderCategories: (ids: string[]) => send(() => client.categories.order.$put({ json: { ids } })),

  createMemo: (categoryId: string, input: MemoInput) =>
    send(() => client.categories[':id'].memos.$post({ param: { id: categoryId }, json: input })),
  updateMemo: (id: string, input: MemoInput) =>
    send(() => client.memos[':id'].$patch({ param: { id }, json: input })),
  deleteMemo: (id: string) => send(() => client.memos[':id'].$delete({ param: { id } })),
  reorderMemos: (categoryId: string, ids: string[]) =>
    send(() =>
      client.categories[':id'].memos.order.$put({ param: { id: categoryId }, json: { ids } }),
    ),

  /** Withdraws, hard-deleting all of the user's categories and memos. */
  withdraw: async () => {
    await send(() => client.me.$delete())
  },
}
