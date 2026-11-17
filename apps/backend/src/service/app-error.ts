export type AppErrorCode =
  | 'unauthorized'
  | 'terms_not_agreed'
  | 'not_found'
  | 'limit_exceeded'
  | 'validation'

/** A business outcome the client is told about as `{ code, message }`. The route maps it to a status. */
export class AppError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'AppError'
    this.code = code
  }
}
