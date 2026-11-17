import { expect, test } from 'vite-plus/test'

import { createSessionAuthGuard, SESSION_COOKIE } from './auth-guard.session.ts'

const guard = createSessionAuthGuard(async (token) =>
  token === 'good' ? { id: 'u1', termsVersion: 'v1' } : null,
)

test('resolves the user of the session cookie', async () => {
  const request = new Request('http://localhost/', {
    headers: { cookie: `other=1; ${SESSION_COOKIE}=good` },
  })

  await expect(guard.authenticate(request)).resolves.toEqual({ id: 'u1', termsVersion: 'v1' })
})

test('resolves null without the cookie or with an unknown token', async () => {
  await expect(guard.authenticate(new Request('http://localhost/'))).resolves.toBeNull()
  await expect(
    guard.authenticate(
      new Request('http://localhost/', { headers: { cookie: `${SESSION_COOKIE}=bad` } }),
    ),
  ).resolves.toBeNull()
})
