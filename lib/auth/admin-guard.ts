import { NextResponse } from 'next/server'
import { errForbidden, errUnauthorized } from '@/lib/api/errors'
import { assertSameOrigin } from '@/lib/api/origin'
import { getServerSession, type ServerSessionUser } from './server'

export type GuardResult =
  | { ok: true; user: ServerSessionUser }
  | { ok: false; response: NextResponse }

/**
 * Pass the incoming Request to enable origin (CSRF) checks on state-changing
 * methods. The argument is optional for backwards compatibility with handlers
 * that haven't been updated yet.
 */
export async function requireAdmin(req?: Request): Promise<GuardResult> {
  if (req) {
    const originErr = assertSameOrigin(req)
    if (originErr) return { ok: false, response: originErr }
  }
  const session = await getServerSession()
  if (!session) {
    return { ok: false, response: errUnauthorized() }
  }
  if (session.user.role !== 'ADMIN') {
    return { ok: false, response: errForbidden('Admin role required.') }
  }
  return { ok: true, user: session.user }
}
