import type { CategoryDao, CategoryRecord } from 'backend/src/dao/category.interface.ts'
import type { MemoDao, MemoRecord } from 'backend/src/dao/memo.interface.ts'
import type {
  SessionDao,
  SessionRecord,
  SessionUserRecord,
} from 'backend/src/dao/session.interface.ts'
import type { UserDao, UserRecord } from 'backend/src/dao/user.interface.ts'

/** D1 DAOs. Behaves like `backend/src/dao/memory.ts`; tables in `migrations/`. */
export const createD1Daos = (db: D1Database) => {
  const first = <T>(sql: string, ...params: unknown[]) =>
    db
      .prepare(sql)
      .bind(...params)
      .first<T>()
  const all = async <T>(sql: string, ...params: unknown[]) =>
    (
      await db
        .prepare(sql)
        .bind(...params)
        .all<T>()
    ).results
  const run = async (sql: string, ...params: unknown[]) => {
    await db
      .prepare(sql)
      .bind(...params)
      .run()
  }
  /** Runs the statements in one transaction. */
  const batch = async (statements: [string, ...unknown[]][]) => {
    if (statements.length) {
      await db.batch(statements.map(([sql, ...params]) => db.prepare(sql).bind(...params)))
    }
  }

  const userDao: UserDao = {
    findById: (id) => first<UserRecord>('SELECT * FROM users WHERE id = ?', id),
    findByGoogleSub: (sub) => first<UserRecord>('SELECT * FROM users WHERE google_sub = ?', sub),
    insert: (u) =>
      run(
        'INSERT INTO users (id, google_sub, terms_version, terms_agreed_at, created_at) VALUES (?, ?, ?, ?, ?)',
        u.id,
        u.google_sub,
        u.terms_version,
        u.terms_agreed_at,
        u.created_at,
      ),
    updateTerms: (id, version, at) =>
      run('UPDATE users SET terms_version = ?, terms_agreed_at = ? WHERE id = ?', version, at, id),
    deleteWithData: (id) =>
      batch([
        ['DELETE FROM memos WHERE user_id = ?', id],
        ['DELETE FROM categories WHERE user_id = ?', id],
        ['DELETE FROM sessions WHERE user_id = ?', id],
        ['DELETE FROM users WHERE id = ?', id],
      ]),
  }

  const sessionDao: SessionDao = {
    insert: (s: SessionRecord) =>
      run(
        'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
        s.token_hash,
        s.user_id,
        s.expires_at,
        s.created_at,
      ),
    findWithUser: (hash) =>
      first<SessionUserRecord>(
        'SELECT s.user_id, s.expires_at, u.terms_version FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?',
        hash,
      ),
    updateExpiry: (hash, expiresAt) =>
      run('UPDATE sessions SET expires_at = ? WHERE token_hash = ?', expiresAt, hash),
    delete: (hash) => run('DELETE FROM sessions WHERE token_hash = ?', hash),
    deleteExpired: (now) => run('DELETE FROM sessions WHERE expires_at <= ?', now),
  }

  const categoryDao: CategoryDao = {
    findLive: (userId, id) =>
      first<CategoryRecord>(
        'SELECT * FROM categories WHERE user_id = ? AND id = ? AND deleted_at IS NULL',
        userId,
        id,
      ),
    listLive: (userId) =>
      all<CategoryRecord>(
        'SELECT * FROM categories WHERE user_id = ? AND deleted_at IS NULL',
        userId,
      ),
    listChangedSince: (userId, since) =>
      all<CategoryRecord>(
        'SELECT * FROM categories WHERE user_id = ? AND updated_at >= ?',
        userId,
        since,
      ),
    insert: (c) =>
      run(
        'INSERT INTO categories (id, user_id, name, sort_order, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        c.id,
        c.user_id,
        c.name,
        c.sort_order,
        c.created_at,
        c.updated_at,
        c.deleted_at,
      ),
    update: (records) =>
      batch(
        records.map((c) => [
          'UPDATE categories SET name = ?, sort_order = ?, updated_at = ?, deleted_at = ? WHERE id = ? AND user_id = ?',
          c.name,
          c.sort_order,
          c.updated_at,
          c.deleted_at,
          c.id,
          c.user_id,
        ]),
      ),
    purgeDeletedBefore: (before) =>
      batch([
        [
          'DELETE FROM memos WHERE category_id IN (SELECT id FROM categories WHERE deleted_at < ?)',
          before,
        ],
        ['DELETE FROM categories WHERE deleted_at < ?', before],
      ]),
  }

  const memoDao: MemoDao = {
    findLive: (userId, id) =>
      first<MemoRecord>(
        'SELECT * FROM memos WHERE user_id = ? AND id = ? AND deleted_at IS NULL',
        userId,
        id,
      ),
    listLiveByCategory: (userId, categoryId) =>
      all<MemoRecord>(
        'SELECT * FROM memos WHERE user_id = ? AND category_id = ? AND deleted_at IS NULL',
        userId,
        categoryId,
      ),
    // Through the user's live categories (a category belongs to one user), so only live memos of
    // live categories are read, without a categories lookup per memo.
    listLiveInLiveCategories: (userId) =>
      all<MemoRecord>(
        'SELECT * FROM memos WHERE category_id IN (SELECT id FROM categories WHERE user_id = ? AND deleted_at IS NULL) AND deleted_at IS NULL',
        userId,
      ),
    listChangedSince: (userId, since) =>
      all<MemoRecord>('SELECT * FROM memos WHERE user_id = ? AND updated_at >= ?', userId, since),
    insert: (m) =>
      run(
        'INSERT INTO memos (id, user_id, category_id, keyword, body, sort_order, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        m.id,
        m.user_id,
        m.category_id,
        m.keyword,
        m.body,
        m.sort_order,
        m.created_at,
        m.updated_at,
        m.deleted_at,
      ),
    update: (records) =>
      batch(
        records.map((m) => [
          'UPDATE memos SET keyword = ?, body = ?, sort_order = ?, updated_at = ?, deleted_at = ? WHERE id = ? AND user_id = ?',
          m.keyword,
          m.body,
          m.sort_order,
          m.updated_at,
          m.deleted_at,
          m.id,
          m.user_id,
        ]),
      ),
    purgeDeletedBefore: (before) => run('DELETE FROM memos WHERE deleted_at < ?', before),
  }

  return { userDao, sessionDao, categoryDao, memoDao }
}
