/**
 * 端末ごとの設定。localStorage に保持する（「DBの外で管理するデータ」参照）。
 * - メモ一覧の表示形式（1カラム／2カラム）
 * - メモ一覧（2カラム表示）の境界線の位置
 * - この端末で同意した利用規約・プライバシーポリシーの版
 */
import { ref, watch } from 'vue'

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* プライベートモードなどで保存できなくても動作は続ける */
  }
}

const storedColumns = read('mmmm.memoColumns')
/** null のときは画面幅で決める（スマホは1カラム、それ以外は2カラム） */
export const memoColumns = ref<1 | 2 | null>(
  storedColumns === '1' ? 1 : storedColumns === '2' ? 2 : null,
)
watch(memoColumns, (v) => v && write('mmmm.memoColumns', String(v)))

const storedLeft = Number(read('mmmm.memoColumnLeftPx'))
/** 2カラム表示の左側（キーワード）の幅。null のときは一覧の幅から決める */
export const memoLeftWidth = ref<number | null>(
  Number.isFinite(storedLeft) && storedLeft > 0 ? storedLeft : null,
)
watch(memoLeftWidth, (v) => v !== null && write('mmmm.memoColumnLeftPx', String(Math.round(v))))

export const deviceAgreedTerms = ref(read('mmmm.agreedTermsVersion'))
watch(deviceAgreedTerms, (v) => v && write('mmmm.agreedTermsVersion', v))
