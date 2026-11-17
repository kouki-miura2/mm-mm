import { charLength, LIMITS, truncateChars } from 'utils'

import type { Memo } from '../api/types.ts'

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toRegExp = (query: string) => {
  const q = query.trim()
  return q ? new RegExp(escape(q), 'giu') : null
}

/** カテゴリの中で、キーワードおよびメモを部分一致で検索する（大文字・小文字は区別しない） */
export const filterMemos = (memos: Memo[], query: string): Memo[] => {
  const re = toRegExp(query)
  if (!re) return memos
  const test = (s: string | null) => {
    if (!s) return false
    re.lastIndex = 0
    return re.test(s)
  }
  return memos.filter((m) => test(m.keyword) || test(m.body))
}

export const highlightParts = (text: string, query: string): { text: string; hit: boolean }[] => {
  const re = toRegExp(query)
  if (!re) return [{ text, hit: false }]
  const parts: { text: string; hit: boolean }[] = []
  let last = 0
  for (const m of text.matchAll(re)) {
    const i = m.index
    if (i > last) parts.push({ text: text.slice(last, i), hit: false })
    parts.push({ text: m[0], hit: true })
    last = i + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false })
  return parts
}

/** キーワードを省略したメモは、本文の先頭N文字（「リミット値」参照）をキーワード欄に表示する */
export const displayKeyword = (memo: Memo): { text: string; fallback: boolean } => {
  if (memo.keyword) return { text: memo.keyword, fallback: false }
  const body = memo.body.replace(/\s+/g, ' ').trim()
  const max = LIMITS.keywordFallbackMaxLength
  const head = truncateChars(body, max)
  return { text: charLength(body) > max ? `${head}…` : head, fallback: true }
}
