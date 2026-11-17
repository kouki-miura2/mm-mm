import { LIMITS, TERMS_VERSION } from 'utils'
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test'

import { createMemoryDaos } from '../dao/memory.ts'
import type { IdTokenVerifier } from '../repository/id-token.google.ts'
import { createUserRepository } from '../repository/user.repository.ts'
import { createAuthService } from './auth.service.ts'

const verifier: IdTokenVerifier = {
  verify: async (idToken) => (idToken.startsWith('valid:') ? idToken.slice(6) : null),
}
const ttl = LIMITS.sessionTtlHours * 3_600_000

// The repository over the in-memory DAOs serves as the fake (users and sessions are stateful).
const setup = () => {
  const { userDao, sessionDao } = createMemoryDaos()
  return createAuthService(createUserRepository(userDao, sessionDao), verifier)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
})
afterEach(() => vi.useRealTimers())

test('registers a new user only after consent', async () => {
  const service = setup()

  await expect(service.loginWithGoogle('valid:sub', null)).rejects.toMatchObject({
    code: 'terms_not_agreed',
  })
  await expect(service.loginWithGoogle('valid:sub', 'old')).rejects.toMatchObject({
    code: 'terms_not_agreed',
  })

  const { me, token } = await service.loginWithGoogle('valid:sub', TERMS_VERSION)
  expect(me).toEqual({
    userId: expect.any(String),
    termsVersion: TERMS_VERSION,
    termsAgreedAt: 1_000_000,
  })
  expect(token).toMatch(/^[\w-]{43}$/)

  // A registered user signs in without sending a version again
  const again = await service.loginWithGoogle('valid:sub', null)
  expect(again.me.userId).toBe(me.userId)
})

test('rejects an invalid ID token', async () => {
  await expect(setup().loginWithGoogle('forged', TERMS_VERSION)).rejects.toMatchObject({
    code: 'unauthorized',
  })
})

test('sessions authenticate until they expire, sliding after half their lifetime', async () => {
  const service = setup()
  const { me, token } = await service.loginWithGoogle('valid:sub', TERMS_VERSION)

  await expect(service.authenticate(token)).resolves.toEqual({
    id: me.userId,
    termsVersion: TERMS_VERSION,
  })
  await expect(service.authenticate('unknown')).resolves.toBeNull()

  vi.setSystemTime(1_000_000 + ttl * 0.75)
  await expect(service.authenticate(token)).resolves.not.toBeNull()
  vi.setSystemTime(1_000_000 + ttl * 1.5)
  await expect(service.authenticate(token)).resolves.not.toBeNull()
  vi.setSystemTime(1_000_000 + ttl * 3)
  await expect(service.authenticate(token)).resolves.toBeNull()
})

test('logout ends the session', async () => {
  const service = setup()
  const { token } = await service.loginWithGoogle('valid:sub', TERMS_VERSION)

  await service.logout(token)

  await expect(service.authenticate(token)).resolves.toBeNull()
})

test('agreeing to the current terms records it; other versions are rejected', async () => {
  const service = setup()
  const { me } = await service.loginWithGoogle('valid:sub', TERMS_VERSION)
  vi.setSystemTime(2_000_000)

  await expect(service.agreeTerms(me.userId, 'old')).rejects.toMatchObject({ code: 'validation' })
  await expect(service.agreeTerms(me.userId, TERMS_VERSION)).resolves.toMatchObject({
    termsAgreedAt: 2_000_000,
  })
})

test('withdrawal removes the user and their sessions', async () => {
  const service = setup()
  const { me, token } = await service.loginWithGoogle('valid:sub', TERMS_VERSION)

  await service.withdraw(me.userId)

  await expect(service.authenticate(token)).resolves.toBeNull()
  await expect(service.me(me.userId)).rejects.toMatchObject({ code: 'unauthorized' })
})

test('development login uses its own namespace of users', async () => {
  const service = setup()
  const dev = await service.loginForDevelopment('sub', TERMS_VERSION)
  const google = await service.loginWithGoogle('valid:sub', TERMS_VERSION)

  expect(dev.me.userId).not.toBe(google.me.userId)
})
