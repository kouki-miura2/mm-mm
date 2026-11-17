import { LIMITS } from 'utils'
import { expect, test } from 'vite-plus/test'

import type { Memo } from '../api/types.ts'
import { displayKeyword, filterMemos, highlightParts } from './search.ts'

const memo = (keyword: string | null, body: string): Memo => ({
  id: crypto.randomUUID(),
  categoryId: 'c',
  keyword,
  body,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
})

test('filters memos by keyword or body, ignoring case', () => {
  const memos = [memo('Docker', 'restart'), memo(null, 'docker logs'), memo('git', 'amend')]

  expect(filterMemos(memos, 'DOCKER')).toEqual([memos[0], memos[1]])
  expect(filterMemos(memos, '  ')).toBe(memos)
})

test('treats the query as plain text, not a pattern', () => {
  expect(filterMemos([memo('a.b', ''), memo('axb', '')], 'a.b')).toHaveLength(1)
})

test('splits text into highlighted parts', () => {
  expect(highlightParts('abcABC', 'bc')).toEqual([
    { text: 'a', hit: false },
    { text: 'bc', hit: true },
    { text: 'A', hit: false },
    { text: 'BC', hit: true },
  ])
})

test('shows the head of the body in place of an omitted keyword', () => {
  const max = LIMITS.keywordFallbackMaxLength

  expect(displayKeyword(memo('kw', 'body'))).toEqual({ text: 'kw', fallback: false })
  expect(displayKeyword(memo(null, 'a\n b'))).toEqual({ text: 'a b', fallback: true })
  expect(displayKeyword(memo(null, '😀'.repeat(max + 1))).text).toBe(`${'😀'.repeat(max)}…`)
})
