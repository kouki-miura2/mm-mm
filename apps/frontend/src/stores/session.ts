import { TERMS_VERSION } from 'utils'
/**
 * ログイン状態と、利用規約・プライバシーポリシーへの同意。
 * セッショントークンは HttpOnly Cookie にあり、画面からは読めない。
 */
import { computed, reactive } from 'vue'

import { api, ApiError } from '../api/index.ts'
import type { Me } from '../api/types.ts'
import { isOnline } from '../composables/online.ts'
import * as idb from '../db/idb.ts'
import { clearLocal, loadLocal, setUnauthorizedHandler, sync } from './data.ts'
import { deviceAgreedTerms } from './prefs.ts'

type Status = 'unknown' | 'guest' | 'authed'

export const session = reactive({
  status: 'unknown' as Status,
  me: null as Me | null,
  /** オフラインで起動し、サーバーに確認できていない */
  unverified: false,
})

/** 利用規約・プライバシーポリシーが改定され、再同意が必要 */
export const needsReagree = computed(
  () => !!session.me && session.me.termsVersion !== TERMS_VERSION,
)

let initPromise: Promise<void> | null = null

export const initSession = () => {
  return (initPromise ??= (async () => {
    const snap = await loadLocal()
    try {
      await enter(await api.me(), false)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'offline' && snap.userId) {
        // オフラインでも、前回の複製があれば参照できる
        session.status = 'authed'
        session.unverified = true
      } else {
        session.status = 'guest'
      }
    }
  })())
}

setUnauthorizedHandler(() => {
  session.status = 'guest'
  session.me = null
})

const enter = async (me: Me, waitSync = true) => {
  const snap = await idb.loadSnapshot()
  // 別のアカウントの複製が残っていたら消す
  if (snap.userId && snap.userId !== me.userId) {
    await clearLocal()
    await loadLocal()
  }
  await idb.setUserId(me.userId)
  session.me = me
  session.status = 'authed'
  session.unverified = false
  if (waitSync) await sync()
  else void sync()
}

const signIn = async (request: (termsVersion: string | null) => Promise<Me>) => {
  if (!isOnline.value) throw new ApiError('offline')
  await enter(await request(deviceAgreedTerms.value))
}

/** Googleでログイン（Google Identity Services の ID トークン） */
export const login = (idToken: string) =>
  signIn((termsVersion) => api.loginWithGoogle(idToken, termsVersion))

/** 開発用ログイン。`import.meta.env.DEV` のときだけ画面に出し、API も `wrangler dev` でだけ受け付ける */
export const loginForDevelopment = () =>
  signIn((termsVersion) => api.loginForDevelopment('dev', termsVersion))

export const agreeTerms = async () => {
  const me = await api.agreeTerms(TERMS_VERSION)
  deviceAgreedTerms.value = TERMS_VERSION
  session.me = me
  // 同意するまで API は同期を受け付けない
  void sync()
}

export const logout = async () => {
  try {
    await api.logout()
  } finally {
    await clearLocal()
    session.me = null
    session.status = 'guest'
  }
}

export const withdraw = async () => {
  await api.withdraw()
  await clearLocal()
  deviceAgreedTerms.value = null
  localStorage.removeItem('mmmm.agreedTermsVersion')
  session.me = null
  session.status = 'guest'
}

/** オンラインに戻ったとき・アプリが前面に戻ったときに同期する */
export const startAutoSync = () => {
  window.addEventListener('online', async () => {
    if (session.status !== 'authed') return
    if (session.unverified) {
      try {
        session.me = await api.me()
        session.unverified = false
      } catch (err) {
        if (err instanceof ApiError && err.code === 'unauthorized') {
          session.status = 'guest'
          return
        }
      }
    }
    void sync()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && session.status === 'authed') void sync()
  })
}
