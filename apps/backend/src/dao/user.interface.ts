/** Raw `users` row (see `docs/spec.md` "データ仕様"). */
export interface UserRecord {
  id: string
  google_sub: string
  terms_version: string
  terms_agreed_at: number
  created_at: number
}

export interface UserDao {
  findById: (id: string) => Promise<UserRecord | null>
  findByGoogleSub: (googleSub: string) => Promise<UserRecord | null>
  insert: (record: UserRecord) => Promise<void>
  updateTerms: (id: string, termsVersion: string, agreedAt: number) => Promise<void>
  /** Hard-deletes the user with all of their sessions, categories and memos (withdrawal). */
  deleteWithData: (id: string) => Promise<void>
}
