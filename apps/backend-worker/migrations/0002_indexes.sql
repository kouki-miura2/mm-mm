-- Indexes that keep D1 rows read low (docs/spec.md "データ仕様"): without them these queries scan
-- whole tables, across every user.

-- Memos of one category: count and next sort order on create, reorder, the full sync, and the memos
-- of purged categories. `deleted_at` lets "live memos" skip soft-deleted rows.
CREATE INDEX memos_category ON memos (category_id, deleted_at);

-- Daily purge of soft-deleted rows. Partial, so live rows (most of them) are not in the index and
-- writing them costs nothing extra.
CREATE INDEX memos_deleted ON memos (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX categories_deleted ON categories (deleted_at) WHERE deleted_at IS NOT NULL;

-- Withdrawal deletes the user's sessions.
CREATE INDEX sessions_user ON sessions (user_id);
