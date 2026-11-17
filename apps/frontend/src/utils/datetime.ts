import { formatDate } from 'utils'

/** Date and time as the spec shows them ("総論 > 共通ルール > 日付・日時の表示"): `2026/09/29 10:21`. */
export const formatDateTime = (epochMs: number): string =>
  formatDate(new Date(epochMs), 'yyyy/MM/dd HH:mm')
