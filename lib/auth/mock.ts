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
 * Toggle to simulate signed-out state during dev (test the public auth pills).
 * Flip to `false` to render Sign In / Sign Up; leave `true` for the avatar dropdown.
 */
export const MOCK_AUTH_ENABLED = true

/** ID of the user that getMockSession will return. Toggle for testing. */
export const MOCK_ACTIVE_USER_ID = '1'

export type MockSession = { user: MockUser }

export async function getMockSession(): Promise<MockSession | null> {
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
