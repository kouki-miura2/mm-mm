import { verifyWithJwks } from 'hono/jwt'

export interface IdTokenVerifier {
  /** The `sub` of a valid ID token, or `null`. */
  verify: (idToken: string) => Promise<string | null>
}

/**
 * Verifies a Google ID token (Sign in with Google): signature against Google's JWKS, `iss`,
 * `aud` (the web OAuth client ID) and `exp`. Rejects everything when `clientId` is empty.
 */
export const createGoogleIdTokenVerifier = (clientId: string): IdTokenVerifier => ({
  verify: async (idToken) => {
    if (!clientId) return null
    try {
      const payload = await verifyWithJwks(idToken, {
        jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
        allowedAlgorithms: ['RS256'],
        verification: { iss: /^(https:\/\/)?accounts\.google\.com$/, aud: clientId },
      })
      return typeof payload.sub === 'string' && payload.sub ? payload.sub : null
    } catch {
      return null
    }
  },
})
