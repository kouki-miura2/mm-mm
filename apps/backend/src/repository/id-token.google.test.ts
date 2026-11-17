import { expect, test } from 'vite-plus/test'

import { createGoogleIdTokenVerifier } from './id-token.google.ts'

test('rejects every token when no client id is configured', async () => {
  await expect(createGoogleIdTokenVerifier('').verify('a.b.c')).resolves.toBeNull()
})

test('rejects a malformed token without fetching the keys', async () => {
  await expect(createGoogleIdTokenVerifier('client-id').verify('not-a-jwt')).resolves.toBeNull()
})
