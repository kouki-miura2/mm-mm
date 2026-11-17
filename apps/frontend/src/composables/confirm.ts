import { reactive } from 'vue'

export interface ConfirmOptions {
  title: string
  text: string
  okText?: string
  danger?: boolean
}

/** 削除前などの確認ダイアログ。App.vue の ConfirmDialog が表示する */
export const confirmState = reactive({
  visible: false,
  options: { title: '', text: '' } as ConfirmOptions,
  resolve: null as ((ok: boolean) => void) | null,
})

export const confirm = (options: ConfirmOptions): Promise<boolean> => {
  confirmState.resolve?.(false)
  confirmState.options = options
  confirmState.visible = true
  return new Promise((resolve) => {
    confirmState.resolve = resolve
  })
}

export const settleConfirm = (ok: boolean) => {
  confirmState.visible = false
  confirmState.resolve?.(ok)
  confirmState.resolve = null
}
