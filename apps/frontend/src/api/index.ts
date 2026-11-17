// Frontend only for now: the mock API in the browser stands in for the backend. When the backend
// exists, replace it with the Hono RPC client (see the root AGENTS.md) and drop `mock.ts`.
export { mockApi as api } from './mock.ts'
export { ApiError } from './types.ts'
export type { Api, MemoInput } from './types.ts'
