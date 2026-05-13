import { NextResponse } from 'next/server'
import { errForbidden, errUnauthorized } from '@/lib/api/errors'
import { assertSameOrigin } from '@/lib/api/origin'
import { getServerSession, type ServerSessionUser } from './server'

export type GuardResult =
  | { ok: true; user: ServerSessionUser }
  | { ok: false; response: NextResponse }

/**
 * Role policy:
 *   - USER   — buyers/readers, restricted to /dashboard.
 *   - ADMIN  — developer (Kamal). Technical maintainer.
 *   - CLIENT — site owner (Dr. Khaled). Business operator.
 *
 * ADMIN and CLIENT are BOTH trusted operators. The two roles exist for
 * audit-trail clarity (so server logs and admin activity history can
 * distinguish "the developer pushed this" from "the owner pushed this"),
 * not for privilege separation. Every /admin/* surface that calls this
 * guard accepts either role.
 *
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
  if (session.user.role !== 'ADMIN' && session.user.role !== 'CLIENT') {
    return { ok: false, response: errForbidden('Admin role required.') }
  }
  return { ok: true, user: session.user }
}
