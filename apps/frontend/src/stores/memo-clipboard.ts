import { ref } from 'vue'

import type { Memo, MemoInput } from '../api/types.ts'

/**
 * コピーしたメモ（キーワードとメモ本文）。別のカテゴリを開いて貼り付けると、そのカテゴリに
 * 追加する。アプリを開いている間だけ保持し、貼り付けた後も残す（続けて別のカテゴリにも貼れる）。
 */
export const copiedMemo = ref<MemoInput | null>(null)

export const copyMemo = (memo: Memo) => {
  copiedMemo.value = { keyword: memo.keyword, body: memo.body }
}

export const clearCopiedMemo = () => {
  copiedMemo.value = null
}
