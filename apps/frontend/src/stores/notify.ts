import { reactive } from 'vue'

import { ApiError } from '../api/index.ts'

/** 画面下部に出すメッセージ（スナックバー）。表示中は更新通知を隠す */
export const notice = reactive({ visible: false, text: '', error: false })

export const notify = (text: string, error = false) => {
  notice.text = text
  notice.error = error
  notice.visible = true
}

export const messageFor = (
  err: unknown,
  limitMessage = '登録できる件数の上限に達しています。',
): string => {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'offline':
        return 'オフラインのため保存できません。オンラインに戻ってから保存してください。'
      case 'unauthorized':
        return 'ログインの有効期限が切れました。もう一度ログインしてください。'
      case 'limit_exceeded':
        return limitMessage
      case 'not_found':
        return '対象のデータが見つかりませんでした。最新の状態に更新しました。'
      case 'validation':
        return err.message
      case 'terms_not_agreed':
        return '利用規約とプライバシーポリシーへの同意が必要です。'
    }
  }
  return '保存できませんでした。時間をおいてもう一度お試しください。'
}
