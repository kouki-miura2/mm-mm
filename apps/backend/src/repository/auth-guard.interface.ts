export interface AuthenticatedUser {
  id: string
  /** Version of the terms of service and privacy policy the user agreed to. */
  termsVersion: string
}

export interface AuthGuard {
  /** Resolves the authenticated user from a request, or `null` if unauthenticated. */
  authenticate: (request: Request) => Promise<AuthenticatedUser | null>
}
