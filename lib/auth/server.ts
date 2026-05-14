import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { auth } from './index'
import {
  MOCK_AUTH_ENABLED,
  getMockSession,
  type MockUser,
} from './mock'

export type ServerSessionUser = {
  id: string
  email: string
  name: string
  role: 'USER' | 'ADMIN' | 'CLIENT'
  image?: string | null
}

export type ServerSession = { user: ServerSessionUser } | null

function fromMock(u: MockUser): ServerSessionUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    image: u.image ?? null,
  }
}

/**
 * Resolves the current session.
 *
 * - In mock mode (MOCK_AUTH_ENABLED), returns the impersonated mock user.
 * - In real mode, calls Better Auth via the request headers.
 *
 * SECURITY [C-2]: The `NODE_ENV !== 'production'` guard is intentional and
 * redundant with the same guard in MOCK_AUTH_ENABLED itself — kept here as
 * defense-in-depth so a future refactor of mock.ts can't reintroduce the
 * "anonymous-visitor-becomes-admin" failure mode.
 */
export async function getServerSession(): Promise<ServerSession> {
  if (process.env.NODE_ENV !== 'production' && MOCK_AUTH_ENABLED) {
    const m = await getMockSession()
    return m ? { user: fromMock(m.user) } : null
  }

  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return null
    const role =
      ((session.user as { role?: string }).role as 'USER' | 'ADMIN' | 'CLIENT') ??
      'USER'
    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name ?? session.user.email,
        role,
        image: session.user.image ?? null,
      },
    }
  } catch (err) {
    // DYNAMIC_SERVER_USAGE is Next.js's intentional opt-out-of-static-render
    // signal (triggered by headers()/cookies() during prerender). Re-throw so
    // Next can handle it; logging the stack trace pollutes build output.
    if ((err as { digest?: string })?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw err
    }
    console.error('[getServerSession]', err)
    return null
  }
}

export async function requireServerRole(
  role: 'ADMIN' | 'CLIENT',
): Promise<ServerSessionUser> {
  const session = await getServerSession()
  if (!session) throw new Error('UNAUTHORIZED')
  if (session.user.role !== role && session.user.role !== 'ADMIN') {
    throw new Error('UNAUTHORIZED')
  }
  return session.user
}

/**
 * Page-level guard for developer-only admin surfaces. Reaches into Next.js's
 * `notFound()` so CLIENT viewers see the 404 chrome rather than an
 * UNAUTHORIZED throw they'd interpret as a bug. The `(admin)` layout already
 * verifies the role is ADMIN or CLIENT before any page in this group renders,
 * so by the time we get here the only rejection case is `role === 'CLIENT'`.
 *
 * Used by /admin/settings, /admin/settings/site, /admin/content, /admin/media,
 * /admin/email-queue, /admin/email-queue/[id], /admin/users, /admin/users/[id].
 *
 * Pair with `requireAdminStrict` on the matching API routes so the page-level
 * gate isn't the only barrier — a determined CLIENT can't reach the data via
 * the API even if they bypass the UI.
 */
export async function requireDeveloperPage(): Promise<ServerSessionUser> {
  const session = await getServerSession()
  if (!session || session.user.role !== 'ADMIN') {
    notFound()
  }
  return session.user
}
