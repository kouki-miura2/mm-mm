import { formatDate } from 'utils'

import type { Category, Memo } from '../api/types.ts'

const cell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

/** 選択したカテゴリのキーワード・メモ本文を CSV にする（Excel で開けるよう BOM 付き UTF-8） */
export const buildCsv = (categories: Category[], memosOf: (id: string) => Memo[]): string => {
  const lines = [['カテゴリ', 'キーワード', 'メモ'].join(',')]
  for (const c of categories) {
    for (const m of memosOf(c.id)) lines.push([c.name, m.keyword ?? '', m.body].map(cell).join(','))
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

export const downloadCsv = (text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `mmmm-${formatDate(new Date(), 'yyyyMMdd')}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
