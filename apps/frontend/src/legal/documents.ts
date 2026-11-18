import { LIMITS, TERMS_VERSION } from 'utils'

// The terms of service and privacy policy (docs/spec.md "データ保持・プライバシー"). DRAFT: the
// operator checks it for legal issues. Whenever the text changes, set `TERMS_VERSION`
// (packages/utils/src/terms/terms.ts) to the revision date so users agree again.

const OPERATOR = import.meta.env.VITE_OPERATOR_NAME || '（運営者名）'
const CONTACT = import.meta.env.VITE_CONTACT_EMAIL || '（お問い合わせ先）'
const RETENTION = `${LIMITS.deletedRetentionMonths}か月`

export type LegalKind = 'terms' | 'privacy'

export interface LegalDocument {
  title: string
  /** `YYYY-MM-DD`: the terms version. */
  revisedAt: string
  intro: string
  sections: { heading: string; paragraphs: string[] }[]
}

export const documents: Record<LegalKind, LegalDocument> = {
  terms: {
    title: '利用規約',
    revisedAt: TERMS_VERSION,
    intro: `この利用規約（以下「本規約」）は、${OPERATOR}（以下「運営者」）が提供するメモ管理アプリ「MmMm」（以下「本サービス」）の利用条件を定めるものです。本サービスを利用するには、本規約に同意していただく必要があります。`,
    sections: [
      {
        heading: '第1条（利用登録）',
        paragraphs: [
          '本サービスは、本規約とプライバシーポリシーに同意したうえでGoogleアカウントでログインした時点で利用登録が完了します。',
          '本サービスは日本国内での個人の利用を想定しています。',
        ],
      },
      {
        heading: '第2条（アカウントと端末の管理）',
        paragraphs: [
          'ユーザーは、自己の責任でGoogleアカウントおよび利用する端末を管理するものとします。',
          '本サービスは、登録したメモを端末にも保存します。共用の端末で利用した場合は、利用後にログアウトしてください。ログアウトすると、端末に保存したカテゴリ・メモは消去されます。',
        ],
      },
      {
        heading: '第3条（登録する内容）',
        paragraphs: [
          'ユーザーが登録したカテゴリ・キーワード・メモは、そのユーザーだけが参照できます。',
          'パスワード、クレジットカード番号、他人の個人情報など、漏えいした場合に重大な損害が生じるおそれのある情報は登録しないでください。',
          '登録できる件数・文字数には上限があります。',
        ],
      },
      {
        heading: '第4条（禁止事項）',
        paragraphs: [
          'ユーザーは、法令または公序良俗に違反する行為、第三者の権利を侵害する行為、本サービスの運営を妨げる行為、不正アクセスやこれを試みる行為をしてはなりません。',
        ],
      },
      {
        heading: '第5条（サービスの変更・停止）',
        paragraphs: [
          '運営者は、事前の通知なく本サービスの内容を変更し、または提供を停止・終了することがあります。',
        ],
      },
      {
        heading: '第6条（免責）',
        paragraphs: [
          '運営者は、本サービスに保存されたデータの消失、その他本サービスの利用により生じた損害について、運営者の故意または重過失による場合を除き、責任を負いません。',
          '大切なデータは、設定画面のCSVダウンロードなどで、ユーザー自身でも保管してください。',
        ],
      },
      {
        heading: '第7条（退会）',
        paragraphs: [
          'ユーザーは設定画面からいつでも退会できます。退会すると、登録したすべてのカテゴリ・メモは直ちに完全に削除され、元に戻すことはできません。',
        ],
      },
      {
        heading: '第8条（規約の変更）',
        paragraphs: [
          '運営者は本規約を変更することがあります。変更後は、次にアプリを開いたときに改めて同意をお願いします。',
        ],
      },
      {
        heading: '第9条（準拠法・お問い合わせ）',
        paragraphs: ['本規約は日本法に準拠します。', `お問い合わせ: ${CONTACT}`],
      },
    ],
  },
  privacy: {
    title: 'プライバシーポリシー',
    revisedAt: TERMS_VERSION,
    intro: `${OPERATOR}（以下「運営者」）は、メモ管理アプリ「MmMm」（以下「本サービス」）における利用者の情報を、次のとおり取り扱います。`,
    sections: [
      {
        heading: '1. 取得する情報',
        paragraphs: [
          'Googleアカウントの識別子（氏名・メールアドレス・プロフィール画像は取得・保存しません）。',
          '利用者が登録したカテゴリ・キーワード・メモ。',
          '同意した利用規約・プライバシーポリシーの版と同意日時。',
          '不正利用の防止と障害対応のための、アクセスの記録（日時・操作の種類・利用者の識別子）。',
        ],
      },
      {
        heading: '2. 利用目的',
        paragraphs: [
          '本サービスの提供（メモの保存・表示・検索、端末間での同期）と、その安全な運営のためにのみ利用します。広告や第三者への販売には利用しません。',
        ],
      },
      {
        heading: '3. 公開範囲',
        paragraphs: [
          '登録したカテゴリ・メモは本人だけが参照できます。他の利用者には公開されません。',
        ],
      },
      {
        heading: '4. 保存場所・外部サービス',
        paragraphs: [
          '情報はCloudflare, Inc.のサービス（Cloudflare Workers・D1）に保存されます。',
          'Googleでログインするため、ログイン画面ではGoogle LLCのサービス（Google Identity Services）に接続します。',
        ],
      },
      {
        heading: '5. 端末への保存',
        paragraphs: [
          'ログイン状態を保つためにCookieを使用します。表示を速くし、オフラインでも閲覧できるよう、登録したデータを端末のブラウザ（IndexedDB）に保存します。表示の設定と同意した版は、端末のブラウザ（localStorage）に保存します。',
          'ログアウトまたは退会すると、端末に保存したカテゴリ・メモは消去されます。',
        ],
      },
      {
        heading: '6. 保存期間',
        paragraphs: [
          `削除したカテゴリ・メモは、削除から${RETENTION}後に完全に消去します。`,
          '退会した場合は、その利用者のすべての情報を直ちに完全に消去します。',
        ],
      },
      {
        heading: '7. 開示・訂正・削除',
        paragraphs: [
          'データの確認・訂正・削除は本サービスの画面から行えます。その他のご依頼は下記までご連絡ください。',
        ],
      },
      {
        heading: '8. 改定・お問い合わせ',
        paragraphs: [
          '本ポリシーを改定した場合は、次にアプリを開いたときに改めて同意をお願いします。',
          `お問い合わせ: ${CONTACT}`,
        ],
      },
    ],
  },
}
