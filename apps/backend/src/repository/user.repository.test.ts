import { expect, test, vi } from 'vite-plus/test'

import type { SessionDao } from '../dao/session.interface.ts'
import type { UserDao } from '../dao/user.interface.ts'
import { createUserRepository } from './user.repository.ts'

const userDao: UserDao = {
  findById: async (id) => ({
    id,
    google_sub: 'sub',
    terms_version: 'v1',
    terms_agreed_at: 2,
    created_at: 1,
  }),
  findByGoogleSub: async () => null,
  insert: vi.fn(async () => {}),
  updateTerms: async () => {},
  deleteWithData: async () => {},
}
const sessionDao: SessionDao = {
  insert: vi.fn(async () => {}),
  findWithUser: async () => ({ user_id: 'u1', expires_at: 9, terms_version: 'v1' }),
  updateExpiry: async () => {},
  delete: async () => {},
  deleteExpired: async () => {},
}
const repository = createUserRepository(userDao, sessionDao)

test('maps user rows to and from the domain entity', async () => {
  await expect(repository.findById('u1')).resolves.toEqual({
    id: 'u1',
    googleSub: 'sub',
    termsVersion: 'v1',
    termsAgreedAt: 2,
    createdAt: 1,
  })
  await expect(repository.findByGoogleSub('missing')).resolves.toBeNull()

  await repository.create({
    id: 'u2',
    googleSub: 's2',
    termsVersion: 'v1',
    termsAgreedAt: 3,
    createdAt: 3,
  })
  expect(userDao.insert).toHaveBeenCalledWith({
    id: 'u2',
    google_sub: 's2',
    terms_version: 'v1',
    terms_agreed_at: 3,
    created_at: 3,
  })
})

test('maps sessions to and from the domain entity', async () => {
  await expect(repository.findSession('h')).resolves.toEqual({
    userId: 'u1',
    expiresAt: 9,
    termsVersion: 'v1',
  })

  await repository.createSession({ tokenHash: 'h', userId: 'u1', expiresAt: 9, createdAt: 1 })
  expect(sessionDao.insert).toHaveBeenCalledWith({
    token_hash: 'h',
    user_id: 'u1',
    expires_at: 9,
    created_at: 1,
  })
})
