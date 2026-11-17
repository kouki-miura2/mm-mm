import { expect, test } from 'vite-plus/test'

import type { Category, Memo } from '../api/types.ts'
import { buildCsv } from './csv.ts'

const category = { id: 'c1', name: 'カテゴリ' } as Category
const memos = [
  { keyword: null, body: 'a,"b"\nc' },
  { keyword: 'kw', body: 'plain' },
] as Memo[]

test('builds a BOM-prefixed CSV with quoted cells where needed', () => {
  expect(buildCsv([category], () => memos)).toBe(
    '\uFEFFカテゴリ,キーワード,メモ\r\nカテゴリ,,"a,""b""\nc"\r\nカテゴリ,kw,plain\r\n',
  )
})
