/**
 * Phase H — booking-domain garbage collection cron.
 *
 * Triggered every 30 minutes by Vercel Cron (see `vercel.json`).
 * Vercel auto-injects `Authorization: Bearer $CRON_SECRET` on every
 * cron invocation when the env var is set. Same auth pattern as the
 * twin `/api/cron/expire-gifts` and `/api/cron/process-email-queue`
 * crons.
 *
 * Manual invocation for testing:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://drkhaledghattass.com/api/cron/expire-bookings
 *
 * Runs TWO sweeps in parallel:
 *
 * 1. expirePendingBookingOrders (R-1) — flips PENDING booking_orders
 *    older than 60 min to FAILED. Catches the case where Stripe never
 *    delivers `checkout.session.expired` (rare delivery failures,
 *    dashboard misconfiguration, webhook handler crash). Capacity is
 *    already released by the 15-min hold TTL, so the harm is purely
 *    reporting — admin reports rely on a clean PENDING column for
 *    in-flight revenue. See `expirePendingBookingOrders` docstring
 *    (lib/db/queries.ts) for the full threshold rationale.
 *
 * 2. expireStaleBookingHolds (R-5) — deletes rows in
 *    `bookings_pending_holds` whose `expires_at < NOW()`. The per-
 *    booking sweep at the top of `createBookingHold` is scoped to the
 *    booking being attempted; holds on OTHER bookings accumulate. The
 *    capacity check already excludes expired holds via
 *    `gt(expiresAt, now())`, so deleting them never reduces
 *    availability — strictly garbage collection.
 *
 * The two sweeps are unrelated (different tables, different
 * conditions) so we run them with `Promise.all` rather than
 * sequentially. Both helpers internally swallow exceptions and return
 * zero-counts on failure, so neither can take down the other.
 *
 * Concurrency:
 *   Both queries are idempotent — the PENDING-status predicate on
 *   booking_orders and the `expires_at < NOW()` predicate on holds
 *   mean a second cron firing while the first is in-flight matches
 *   zero rows on the second pass.
 *
 * Auth model:
 *   - Bearer compare with `timingSafeEqual`. Plain `===` leaks
 *     character-position timing on the secret.
 *   - Without `CRON_SECRET` set, deny all invocations with 401 —
 *     fail closed when the secret is missing.
 *
 * Runtime:
 *   - `nodejs` (default for Route Handlers) — required because both
 *     helpers use Drizzle/Neon with the `ws` shim.
 *   - `maxDuration = 60` so the sweeps can finish under Vercel's
 *     Pro function timeout.
 */

import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import {
  expirePendingBookingOrders,
  expireStaleBookingHolds,
} from '@/lib/db/queries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const STALE_THRESHOLD_MINUTES = 60

// Mirrors the bearer compare in `/api/cron/expire-gifts/route.ts` and
// `/api/cron/process-email-queue/route.ts` — keep all three in lockstep.
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? ''
  if (!secret) return false
  const auth = req.headers.get('authorization') ?? ''
  const parts = auth.split(' ')
  if (parts.length !== 2 || parts[0]!.toLowerCase() !== 'bearer') return false
  const provided = parts[1] ?? ''
  if (provided.length !== secret.length) return false
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(secret))
  } catch {
    return false
  }
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const [orderResult, holdResult] = await Promise.all([
      expirePendingBookingOrders(STALE_THRESHOLD_MINUTES),
      expireStaleBookingHolds(),
    ])
    console.info('[cron][expire-bookings] sweep complete', {
      orders: orderResult,
      holds: holdResult,
      thresholdMinutes: STALE_THRESHOLD_MINUTES,
    })
    // Response shape: keep the legacy top-level `scanned`/`expired`
    // fields pointing at the booking_orders sweep so external monitoring
    // (if any) doesn't break, AND expose the new hold counts under
    // discriminated keys so operators can read both.
    return Response.json({
      ok: true,
      scanned: orderResult.scanned,
      expired: orderResult.expired,
      thresholdMinutes: STALE_THRESHOLD_MINUTES,
      orders: orderResult,
      holds: holdResult,
    })
  } catch (err) {
    console.error('[cron][expire-bookings] sweep failed', err)
    return Response.json({ ok: false, error: 'sweep_failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

// Vercel Cron uses GET, but allow POST for manual curl convenience.
export async function POST(req: NextRequest) {
  return handle(req)
}
