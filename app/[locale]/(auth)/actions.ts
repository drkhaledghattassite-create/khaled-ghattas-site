'use server'

/**
 * Phase H — auth-flow server actions.
 *
 * Currently exposes ONE action:
 *   - resendVerificationAction — re-trigger Better Auth's
 *     `sendVerificationEmail` endpoint with belt-and-braces rate
 *     limits the Better Auth instance can't see.
 *
 * Why a server action wrapper:
 *   The UI (AccountView banner, LoginForm error state, GiftClaimPage
 *   unverified branch) calls this action so a SINGLE rate-limit
 *   layer applies regardless of where the user clicked from.
 *   Calling `authClient.sendVerificationEmail` directly from each
 *   surface would re-implement the limit in three places, or rely
 *   solely on Better Auth's internal limit (opaque, version-pinned,
 *   not surfaced to operators).
 *
 *   Better Auth's internal rate limit is left in place as
 *   defense-in-depth: if the limit triggers there first, our wrapper
 *   surfaces it as 'send_failed' (we can't distinguish from our
 *   side, but the toast copy is identical).
 *
 * Limits (Phase H Item 5):
 *   - verify-resend-ip:     5 per 15 min — DoS guard on the limiter
 *                           itself + email infrastructure
 *   - verify-resend-email:  3 per 60 min — guards a specific inbox
 *                           against being spammed by a third party
 *                           who knows the address (per-email key is
 *                           independent of who's requesting)
 *
 * These are deliberately strict — verification emails are high-friction
 * and the legitimate case is a user clicking once, maybe twice. An
 * attacker spamming them is either DoS-ing email infra or trying to
 * phish.
 */

import { auth } from '@/lib/auth'
import { getServerSession } from '@/lib/auth/server'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import { CLIENT_IP_FALLBACK } from '@/lib/api/client-ip'
import { headers } from 'next/headers'
import { z } from 'zod'

type ActionOk<T> = { ok: true } & T
type ActionErr<E extends string> = { ok: false; error: E }

export type ResendVerificationActionResult =
  | ActionOk<{ delivered: boolean }>
  | ActionErr<'validation' | 'rate_limited' | 'send_failed'>

const resendVerificationSchema = z.object({
  // The email the user wants to (re-)verify. Required because the
  // unverified-user-on-login path doesn't have a session yet — we
  // can't always source it from the server session. When the caller
  // IS authenticated, the UI passes session.user.email and we'd
  // ideally cross-check; in practice Better Auth's own send endpoint
  // is the one that resolves the user row by email, so we don't
  // re-implement that lookup here. The downside: an attacker can
  // request a resend for any address — but Better Auth's response
  // doesn't leak whether the address exists, and our per-email
  // rate limit caps the abuse.
  email: z.string().email().max(254),
})

/**
 * Mirrors `getRequestIp` in `gifts/actions.ts` — same precedence,
 * same `CLIENT_IP_FALLBACK` sentinel. See `lib/api/client-ip.ts`
 * for the helper used by route handlers (server actions can't
 * accept a `Request` argument so they read `next/headers` directly).
 */
async function getRequestIp(): Promise<string> {
  try {
    const reqHeaders = await headers()
    const vercelIp = reqHeaders.get('x-vercel-forwarded-for')?.trim()
    if (vercelIp) return vercelIp
    const forwarded = reqHeaders.get('x-forwarded-for') ?? ''
    if (forwarded) {
      const parts = forwarded
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const rightmost = parts[parts.length - 1]
      if (rightmost) return rightmost
    }
    const real = reqHeaders.get('x-real-ip')?.trim()
    if (real) return real
  } catch {
    /* ignore — fall through */
  }
  return CLIENT_IP_FALLBACK
}

export async function resendVerificationAction(input: {
  email: string
}): Promise<ResendVerificationActionResult> {
  const parsed = resendVerificationSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const emailLc = parsed.data.email.trim().toLowerCase()

  // Per-IP cap first — protects the rate-limit infra itself from a
  // shower of requests with rotating email values. The fallback
  // sentinel collapses unknown-IP traffic into a single bucket,
  // making it the strictest case.
  const ip = await getRequestIp()
  const ipLimit = await tryRateLimit(`verify-resend-ip:${ip}`, {
    limit: 5,
    window: '15 m',
  })
  if (!ipLimit.ok) return { ok: false, error: 'rate_limited' }

  // Per-email cap — protects a specific inbox from being spammed by
  // a third party who happens to know the address. Keyed on the
  // normalised email, NOT on session.user.email, because an attacker
  // could spam verification mail for any address via this endpoint.
  const emailLimit = await tryRateLimit(`verify-resend-email:${emailLc}`, {
    limit: 3,
    window: '60 m',
  })
  if (!emailLimit.ok) return { ok: false, error: 'rate_limited' }

  // If we have a session, drop a defensive log line when the
  // requested email != session email. This isn't blocked (the
  // resend-for-stranger case is rare but legitimate — e.g., user
  // logged in as A then mistyped B at signup), but it's worth
  // surfacing in logs.
  const session = await getServerSession().catch(() => null)
  if (session && session.user.email.trim().toLowerCase() !== emailLc) {
    console.info(
      '[auth/resendVerification] requested email differs from session email',
      { sessionEmail: session.user.email, requestedEmail: emailLc },
    )
  }

  // Call Better Auth's send endpoint server-side. The endpoint itself
  // dispatches through our `sendEmail` wrapper (see
  // `lib/auth/index.ts` -> `sendVerificationEmail` callback), so a
  // resend never bypasses the email_queue.
  //
  // We don't surface "user not found" to the caller — Better Auth's
  // own response doesn't either, and any leakage here would defeat
  // the per-email rate limit as a phishing-target enumeration tool.
  try {
    const apiSurface = auth.api as unknown as {
      sendVerificationEmail?: (args: {
        body: { email: string; callbackURL?: string }
        headers?: Headers
      }) => Promise<unknown>
    }
    if (!apiSurface.sendVerificationEmail) {
      console.error('[auth/resendVerification] auth.api.sendVerificationEmail unavailable')
      return { ok: false, error: 'send_failed' }
    }
    const reqHeaders = await headers()
    await apiSurface.sendVerificationEmail({
      body: { email: emailLc },
      headers: new Headers(reqHeaders),
    })
    return { ok: true, delivered: true }
  } catch (err) {
    console.error('[auth/resendVerification] dispatch failed', err)
    return { ok: false, error: 'send_failed' }
  }
}
