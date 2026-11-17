/**
 * バックエンドなしで画面を動かすためのモックAPI。
 * D1 の代わりに localStorage へ「サーバー側のデータ」を保存し、仕様どおりの振る舞い
 * （件数上限・論理削除・updated_at による差分同期・セッション期限）を再現する。
 */
import { addMonths, LIMITS } from 'utils'

import {
  ApiError,
  type Api,
  type Category,
  type ChangedRows,
  type Me,
  type Memo,
  type MemoInput,
  type SyncResponse,
} from './types.ts'

const KEY = 'mmmm.mock-server'

interface ServerState {
  user: (Me & { googleSub: string }) | null
  session: { expiresAt: number } | null
  categories: (Category & { userId: string })[]
  memos: (Memo & { userId: string })[]
}

const load = (): ServerState => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as ServerState
  } catch {
    /* 壊れていたら作り直す */
  }
  return { user: null, session: null, categories: [], memos: [] }
}
const save = (s: ServerState) => localStorage.setItem(KEY, JSON.stringify(s))

const wait = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 120))

/** ネットワーク越しの呼び出しを再現し、セッションと同意を確認する */
const call = async <T>(
  fn: (s: ServerState, now: number) => T,
  opts: { auth?: boolean; terms?: boolean } = {},
) => {
  await wait()
  if (!navigator.onLine) throw new ApiError('offline')
  const s = load()
  const now = Date.now()
  purge(s, now)
  if (opts.auth !== false) {
    if (!s.user || !s.session || s.session.expiresAt <= now) throw new ApiError('unauthorized')
    // 操作のたびにセッションを延長する
    s.session.expiresAt = now + LIMITS.sessionTtlHours * 3_600_000
  }
  const result = fn(s, now)
  save(s)
  return result
}

/** 論理削除から一定期間を過ぎた行を物理削除する（本番では定期処理） */
const purge = (s: ServerState, now: number) => {
  const border = addMonths(new Date(now), -LIMITS.deletedRetentionMonths).getTime()
  const expired = new Set(
    s.categories.filter((c) => c.deletedAt !== null && c.deletedAt < border).map((c) => c.id),
  )
  s.categories = s.categories.filter((c) => !expired.has(c.id))
  s.memos = s.memos.filter(
    (m) => !expired.has(m.categoryId) && !(m.deletedAt !== null && m.deletedAt < border),
  )
}

const strip = <T extends { userId: string }>({ userId: _u, ...rest }: T) => rest
const rows = (
  categories: ServerState['categories'] = [],
  memos: ServerState['memos'] = [],
): ChangedRows => ({
  categories: categories.map(strip),
  memos: memos.map(strip),
})

const me = (s: ServerState): Me => ({
  userId: s.user!.userId,
  termsVersion: s.user!.termsVersion,
  termsAgreedAt: s.user!.termsAgreedAt,
})

const liveCategory = (s: ServerState, id: string) => {
  const c = s.categories.find((x) => x.id === id && x.deletedAt === null)
  if (!c) throw new ApiError('not_found')
  return c
}

const liveMemo = (s: ServerState, id: string) => {
  const m = s.memos.find((x) => x.id === id && x.deletedAt === null)
  if (!m || !s.categories.some((c) => c.id === m.categoryId && c.deletedAt === null))
    throw new ApiError('not_found')
  return m
}

const requireName = (name: string) => {
  const v = name.trim()
  if (!v) throw new ApiError('validation', 'カテゴリ名を入力してください')
  return v
}

const normalizeMemo = (input: MemoInput) => {
  const keyword = input.keyword?.trim() ? input.keyword.trim() : null
  if (!input.body.trim()) throw new ApiError('validation', 'メモを入力してください')
  return { keyword, body: input.body }
}

/** 初回ログイン時に入れておく見本データ */
const seed = (s: ServerState, userId: string, now: number) => {
  const samples: [string, [string | null, string][]][] = [
    [
      'よく使うコマンド',
      [
        ['ポート確認', 'ss -tlnp で LISTEN 中のポートと、使っているプロセスを一覧する。'],
        ['ディスク使用量', 'du -sh * | sort -h\n容量の大きいディレクトリが下に並ぶ。'],
        [null, 'journalctl -u nginx --since today で当日分のログだけ見る'],
        [
          'コンテナ再起動',
          'docker compose restart <サービス名>\n設定を変えたときは up -d でも可。',
        ],
        [
          'コンテナのログ追跡',
          'docker compose logs -f --tail 100 <サービス名>\n直近100行を表示したあと、新しいログを追い続ける。Ctrl + C で終了。',
        ],
        [
          '直前のコミット修正',
          'git commit --amend --no-edit（メッセージはそのまま、ステージした変更だけ追加）',
        ],
        ['SSH鍵の作成', 'ssh-keygen -t ed25519 -C "端末名"'],
        [null, 'tar czf backup.tgz dir/ で圧縮、展開は tar xzf backup.tgz'],
        ['権限の一括変更', 'find . -type d -exec chmod 755 {} +（ファイルは -type f で 644）'],
        ['不要なイメージ削除', 'docker image prune -a で使っていないイメージをまとめて削除'],
      ],
    ],
    [
      '英語フレーズ',
      [
        ['確認のお願い', 'Could you double-check this when you have a moment?'],
        ['日程調整', 'Would Thursday afternoon work for you?'],
      ],
    ],
    ['レシピ', [['だし巻き卵', '卵3個、白だし大さじ1、水大さじ3。弱めの中火で3回に分けて巻く。']]],
  ]
  samples.forEach(([name, memos], ci) => {
    const categoryId = crypto.randomUUID()
    s.categories.push({
      id: categoryId,
      userId,
      name,
      sortOrder: ci,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    memos.forEach(([keyword, body], mi) => {
      s.memos.push({
        id: crypto.randomUUID(),
        userId,
        categoryId,
        keyword,
        body,
        sortOrder: mi,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
    })
  })
}

const reorder = <T extends { id: string; sortOrder: number; updatedAt: number }>(
  list: T[],
  ids: string[],
  now: number,
) => {
  const changed: T[] = []
  ids.forEach((id, index) => {
    const row = list.find((x) => x.id === id)
    // 順番が変わった行だけ sort_order を書き換える
    if (row && row.sortOrder !== index) {
      row.sortOrder = index
      row.updatedAt = now
      changed.push(row)
    }
  })
  return changed
}

export const mockApi: Api = {
  me: () => call((s) => me(s)),

  loginWithGoogle: (_idToken, termsVersion) =>
    call(
      (s, now) => {
        if (!s.user) {
          // 同意の後に登録する（「総論 > 共通ルール > 同意」参照）
          if (!termsVersion) throw new ApiError('terms_not_agreed')
          const userId = crypto.randomUUID()
          s.user = { userId, googleSub: 'mock-sub', termsVersion, termsAgreedAt: now }
          seed(s, userId, now)
        }
        s.session = { expiresAt: now + LIMITS.sessionTtlHours * 3_600_000 }
        return me(s)
      },
      { auth: false },
    ),

  logout: () =>
    call(
      (s) => {
        s.session = null
      },
      { auth: false },
    ),

  agreeTerms: (termsVersion) =>
    call((s, now) => {
      s.user!.termsVersion = termsVersion
      s.user!.termsAgreedAt = now
      return me(s)
    }),

  sync: (since) =>
    call((s, now): SyncResponse => {
      const userId = s.user!.userId
      const border = addMonths(new Date(now), -LIMITS.deletedRetentionMonths).getTime()
      const own = <T extends { userId: string }>(xs: T[]) => xs.filter((x) => x.userId === userId)
      if (since === null || since < border) {
        const live = new Set(
          own(s.categories)
            .filter((c) => c.deletedAt === null)
            .map((c) => c.id),
        )
        return {
          full: true,
          ...rows(
            own(s.categories).filter((c) => live.has(c.id)),
            own(s.memos).filter((m) => m.deletedAt === null && live.has(m.categoryId)),
          ),
          syncedAt: now,
        }
      }
      return {
        full: false,
        ...rows(
          own(s.categories).filter((c) => c.updatedAt >= since),
          own(s.memos).filter((m) => m.updatedAt >= since),
        ),
        syncedAt: now,
      }
    }),

  createCategory: (name) =>
    call((s, now) => {
      const userId = s.user!.userId
      const live = s.categories.filter((c) => c.userId === userId && c.deletedAt === null)
      if (live.length >= LIMITS.categoriesPerUser) throw new ApiError('limit_exceeded')
      const c = {
        id: crypto.randomUUID(),
        userId,
        name: requireName(name),
        sortOrder: Math.max(-1, ...live.map((x) => x.sortOrder)) + 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }
      s.categories.push(c)
      return rows([c])
    }),

  renameCategory: (id, name) =>
    call((s, now) => {
      const c = liveCategory(s, id)
      c.name = requireName(name)
      c.updatedAt = now
      return rows([c])
    }),

  deleteCategory: (id) =>
    call((s, now) => {
      // 含まれるメモの deleted_at は設定しない（「削除・件数の扱い」参照）
      const c = liveCategory(s, id)
      c.deletedAt = now
      c.updatedAt = now
      return rows([c])
    }),

  reorderCategories: (ids) =>
    call((s, now) => {
      const userId = s.user!.userId
      return rows(
        reorder(
          s.categories.filter((c) => c.userId === userId && c.deletedAt === null),
          ids,
          now,
        ),
      )
    }),

  createMemo: (categoryId, input) =>
    call((s, now) => {
      const c = liveCategory(s, categoryId)
      const live = s.memos.filter((m) => m.categoryId === c.id && m.deletedAt === null)
      if (live.length >= LIMITS.memosPerCategory) throw new ApiError('limit_exceeded')
      const m = {
        id: crypto.randomUUID(),
        userId: c.userId,
        categoryId: c.id,
        ...normalizeMemo(input),
        sortOrder: Math.max(-1, ...live.map((x) => x.sortOrder)) + 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }
      s.memos.push(m)
      return rows([], [m])
    }),

  updateMemo: (id, input) =>
    call((s, now) => {
      const m = liveMemo(s, id)
      Object.assign(m, normalizeMemo(input), { updatedAt: now })
      return rows([], [m])
    }),

  deleteMemo: (id) =>
    call((s, now) => {
      const m = liveMemo(s, id)
      m.deletedAt = now
      m.updatedAt = now
      return rows([], [m])
    }),

  reorderMemos: (categoryId, ids) =>
    call((s, now) => {
      liveCategory(s, categoryId)
      return rows(
        [],
        reorder(
          s.memos.filter((m) => m.categoryId === categoryId && m.deletedAt === null),
          ids,
          now,
        ),
      )
    }),

  withdraw: () =>
    call(() => {
      localStorage.removeItem(KEY)
    }).then(() => {
      localStorage.removeItem(KEY)
    }),
}
