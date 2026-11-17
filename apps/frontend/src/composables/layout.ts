import { computed } from 'vue'
import { useDisplay } from 'vuetify'

/**
 * 画面の幅による切り替え。Vuetify 4 の既定ブレークポイント（md 840 / lg 1145）とは別に、
 * 端末の想定に合わせて決める。
 * - スマホ: 768px 未満。1画面ずつ遷移する
 * - タブレット: 768px 以上。カテゴリをサイドバーに常に表示する
 * - PC: 1280px 以上。メモの編集を右側のパネルで行う
 */
export const useLayout = () => {
  const { width } = useDisplay()
  const isWide = computed(() => width.value >= 768)
  const isDesktop = computed(() => width.value >= 1280)
  return { width, isWide, isDesktop }
}
