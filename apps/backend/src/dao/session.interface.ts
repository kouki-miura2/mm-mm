/** Raw `sessions` row. The token itself is never stored, only its SHA-256. */
export interface SessionRecord {
  token_hash: string
  user_id: string
  expires_at: number
  created_at: number
}

/** A session joined with the column of its user that every request needs. */
export interface SessionUserRecord {
  user_id: string
  expires_at: number
  terms_version: string
}

export interface SessionDao {
  insert: (record: SessionRecord) => Promise<void>
  findWithUser: (tokenHash: string) => Promise<SessionUserRecord | null>
  updateExpiry: (tokenHash: string, expiresAt: number) => Promise<void>
  delete: (tokenHash: string) => Promise<void>
  /** Hard-deletes sessions that expired at or before `now`. */
  deleteExpired: (now: number) => Promise<void>
}
