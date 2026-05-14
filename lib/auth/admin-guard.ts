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
 *   - ADMIN  — developer (Kamal). Technical maintainer + system config.
 *   - CLIENT — site owner (Dr. Khaled). Business operator (content + commerce).
 *
 * ADMIN and CLIENT are BOTH trusted operators on the business surfaces
 * (articles, books, orders, gifts, bookings, corporate, subscribers,
 * messages, questions, tests, events, gallery, interviews). Most /admin/*
 * surfaces call `requireAdmin` and accept either role.
 *
 * DEVELOPER-ONLY surfaces — use `requireAdminStrict` (ADMIN only):
 *   - User role management (privilege escalation surface)
 *   - Site-wide settings + feature toggles (`/admin/settings`, `/admin/settings/site`)
 *   - Content blocks + media library (`/admin/content`, `/admin/media`)
 *   - Email queue diagnostics (`/admin/email-queue`)
 *   - User CRUD (`/admin/users`)
 *
 * Rationale: these are system-config / ops surfaces where one operator's
 * mistake can break the site for everyone. The owner (CLIENT) operates the
 * business; the developer (ADMIN) operates the system. The split is
 * defense-in-depth, not a trust statement — both roles remain trusted.
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

/**
 * Stricter variant that admits ADMIN only. Use on endpoints where ADMIN-vs-
 * CLIENT separation is load-bearing — see the "DEVELOPER-ONLY surfaces" list
 * in the header docstring above. A CLIENT reaching one of these endpoints
 * gets a 403, even though they pass the looser `requireAdmin` everywhere
 * else.
 */
export async function requireAdminStrict(req?: Request): Promise<GuardResult> {
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
