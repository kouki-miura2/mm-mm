import type { CategoryDao, CategoryRecord } from './category.interface.ts'
import type { MemoDao, MemoRecord } from './memo.interface.ts'
import type { SessionDao, SessionRecord } from './session.interface.ts'
import type { UserDao, UserRecord } from './user.interface.ts'

/**
 * In-memory DAOs over one shared set of tables (withdrawal and purging cross tables). For tests
 * and as the reference behavior of the D1 DAOs in `apps/backend-worker/src/dao/*.d1.ts`.
 */
export const createMemoryDaos = () => {
  const db = {
    users: [] as UserRecord[],
    sessions: [] as SessionRecord[],
    categories: [] as CategoryRecord[],
    memos: [] as MemoRecord[],
  }
  const one = <T extends object>(row: T | undefined): T | null => (row ? { ...row } : null)
  const all = <T extends object>(rows: T[]): T[] => rows.map((row) => ({ ...row }))
  const isLive = (row: { deleted_at: number | null }) => row.deleted_at === null
  const deletedBefore = (row: { deleted_at: number | null }, before: number) =>
    row.deleted_at !== null && row.deleted_at < before

  const userDao: UserDao = {
    findById: async (id) => one(db.users.find((u) => u.id === id)),
    findByGoogleSub: async (sub) => one(db.users.find((u) => u.google_sub === sub)),
    insert: async (record) => {
      db.users.push({ ...record })
    },
    updateTerms: async (id, version, at) => {
      const user = db.users.find((u) => u.id === id)
      if (user) Object.assign(user, { terms_version: version, terms_agreed_at: at })
    },
    deleteWithData: async (id) => {
      db.memos = db.memos.filter((m) => m.user_id !== id)
      db.categories = db.categories.filter((c) => c.user_id !== id)
      db.sessions = db.sessions.filter((s) => s.user_id !== id)
      db.users = db.users.filter((u) => u.id !== id)
    },
  }

  const sessionDao: SessionDao = {
    insert: async (record) => {
      db.sessions.push({ ...record })
    },
    findWithUser: async (hash) => {
      const session = db.sessions.find((s) => s.token_hash === hash)
      const user = session && db.users.find((u) => u.id === session.user_id)
      return session && user
        ? { user_id: user.id, expires_at: session.expires_at, terms_version: user.terms_version }
        : null
    },
    updateExpiry: async (hash, expiresAt) => {
      const session = db.sessions.find((s) => s.token_hash === hash)
      if (session) session.expires_at = expiresAt
    },
    delete: async (hash) => {
      db.sessions = db.sessions.filter((s) => s.token_hash !== hash)
    },
    deleteExpired: async (now) => {
      db.sessions = db.sessions.filter((s) => s.expires_at > now)
    },
  }

  const categoryDao: CategoryDao = {
    findLive: async (userId, id) =>
      one(db.categories.find((c) => c.user_id === userId && c.id === id && isLive(c))),
    listLive: async (userId) => all(db.categories.filter((c) => c.user_id === userId && isLive(c))),
    listChangedSince: async (userId, since) =>
      all(db.categories.filter((c) => c.user_id === userId && c.updated_at >= since)),
    insert: async (record) => {
      db.categories.push({ ...record })
    },
    update: async (records) => {
      for (const record of records) {
        const row = db.categories.find((c) => c.id === record.id && c.user_id === record.user_id)
        if (row) Object.assign(row, record)
      }
    },
    purgeDeletedBefore: async (before) => {
      const expired = new Set(
        db.categories.filter((c) => deletedBefore(c, before)).map((c) => c.id),
      )
      db.memos = db.memos.filter((m) => !expired.has(m.category_id))
      db.categories = db.categories.filter((c) => !expired.has(c.id))
    },
  }

  const memoDao: MemoDao = {
    findLive: async (userId, id) =>
      one(db.memos.find((m) => m.user_id === userId && m.id === id && isLive(m))),
    listLiveByCategory: async (userId, categoryId) =>
      all(
        db.memos.filter((m) => m.user_id === userId && m.category_id === categoryId && isLive(m)),
      ),
    listLiveInLiveCategories: async (userId) => {
      const live = new Set(
        db.categories.filter((c) => c.user_id === userId && isLive(c)).map((c) => c.id),
      )
      return all(
        db.memos.filter((m) => m.user_id === userId && isLive(m) && live.has(m.category_id)),
      )
    },
    listChangedSince: async (userId, since) =>
      all(db.memos.filter((m) => m.user_id === userId && m.updated_at >= since)),
    insert: async (record) => {
      db.memos.push({ ...record })
    },
    update: async (records) => {
      for (const record of records) {
        const row = db.memos.find((m) => m.id === record.id && m.user_id === record.user_id)
        if (row) Object.assign(row, record)
      }
    },
    purgeDeletedBefore: async (before) => {
      db.memos = db.memos.filter((m) => !deletedBefore(m, before))
    },
  }

  return { userDao, sessionDao, categoryDao, memoDao }
}
