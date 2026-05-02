/**
 * Mock auth — Phase 5 only.
 *
 * Replaced by real Better Auth in Phase 4B. The function signatures
 * (`getMockSession`, `requireRole`) are stable so admin pages and
 * server actions don't change when real auth swaps in.
 *
 * To impersonate a different role for local testing, change the
 * `MOCK_ACTIVE_USER_ID` constant below.
 */

export type MockUser = {
  id: string
  email: string
  name: string
  role: 'USER' | 'ADMIN' | 'CLIENT'
  image?: string
}

export const mockUsers: MockUser[] = [
  {
    id: '1',
    email: 'admin@drkhaledghattass.com',
    name: 'Kamal',
    role: 'ADMIN',
  },
  {
    id: '2',
    email: 'khaled@drkhaledghattass.com',
    name: 'Dr. Khaled Ghattass',
    role: 'CLIENT',
  },
  {
    id: '3',
    email: 'user@example.com',
    name: 'Test User',
    role: 'USER',
  },
]

/**
 * Mock-auth toggle.
 *
 * SECURITY [C-2]: This used to default to ON unless BOTH env vars were the
 * literal string `'false'`. A single env-var miss in production then handed
 * every anonymous visitor an admin session (since `MOCK_ACTIVE_USER_ID = '1'`
 * is the ADMIN mock user). The semantics are now INVERTED:
 *   - Mock is OFF unless explicitly opted in with `MOCK_AUTH=true` or
 *     `NEXT_PUBLIC_MOCK_AUTH=true`.
 *   - Mock can NEVER run when NODE_ENV === 'production', regardless of env.
 * Do NOT relax either gate.
 */
export const MOCK_AUTH_ENABLED =
  process.env.NODE_ENV !== 'production' &&
  (process.env.MOCK_AUTH === 'true' ||
    process.env.NEXT_PUBLIC_MOCK_AUTH === 'true')

/** ID of the user that getMockSession will return. Toggle for testing. */
export const MOCK_ACTIVE_USER_ID = '1'

export type MockSession = { user: MockUser }

export async function getMockSession(): Promise<MockSession | null> {
  // SECURITY [C-2]: belt-and-braces — even if MOCK_AUTH_ENABLED were somehow
  // true in production (build-time env capture, hot-swap, etc.), this throws
  // before any caller can receive a fake admin session. A 500 in production
  // is preferable to a silent privilege escalation.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[lib/auth/mock.ts] Mock auth invoked in production. ' +
        'This is a security violation. Check MOCK_AUTH_ENABLED ' +
        'and ensure real auth is configured.',
    )
  }
  if (!MOCK_AUTH_ENABLED) return null
  const user = mockUsers.find((u) => u.id === MOCK_ACTIVE_USER_ID)
  if (!user) {
    throw new Error(`Mock user ${MOCK_ACTIVE_USER_ID} not found`)
  }
  return { user }
}

/**
 * Throws "UNAUTHORIZED" if the active session does not have the required
 * role. ADMIN passes any required role.
 */
export async function requireRole(role: 'ADMIN' | 'CLIENT'): Promise<MockUser> {
  const session = await getMockSession()
  if (!session) throw new Error('UNAUTHORIZED')
  if (session.user.role !== role && session.user.role !== 'ADMIN') {
    throw new Error('UNAUTHORIZED')
  }
  return session.user
}
