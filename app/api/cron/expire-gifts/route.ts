/**
 * Daily expiry sweep for Phase D gifts.
 *
 * Triggered by Vercel Cron at 03:00 UTC daily (see `vercel.json` →
 * `crons[]`). Vercel auto-injects `Authorization: Bearer $CRON_SECRET`
 * on every cron invocation when the `CRON_SECRET` env var is set.
 *
 * Manual invocation for testing:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://drkhaledghattass.com/api/cron/expire-gifts
 *
 * Auth model:
 *   - We verify `Authorization: Bearer $CRON_SECRET` on every request.
 *     Vercel's scheduler sends this header automatically, so the same
 *     check defends both scheduled invocations and external probes.
 *   - Without `CRON_SECRET` set, we deny all invocations with 503 — fail
 *     closed when the secret is missing rather than fail open.
 *
 * Runtime:
 *   - `nodejs` (default for Route Handlers) — required because
 *     `expirePendingGifts` uses Drizzle/Neon with the `ws` shim.
 *   - `maxDuration = 60` so the sweep can finish under Vercel's Pro
 *     function timeout. The actual work is small (a single UPDATE +
 *     a per-gift booking decrement) so this is headroom.
 */

import type { NextRequest } from 'next/server'
import { expirePendingGifts } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? ''
  if (!secret) return false
  const auth = req.headers.get('authorization') ?? ''
  const parts = auth.split(' ')
  if (parts.length !== 2 || parts[0]!.toLowerCase() !== 'bearer') return false
  return parts[1] === secret
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await expirePendingGifts()
    console.info('[gift-cron] sweep complete', result)
    return Response.json({
      ok: true,
      expiredCount: result.expiredCount,
      bookingReleasedCount: result.bookingReleasedCount,
      errorCount: result.errors.length,
    })
  } catch (err) {
    console.error('[gift-cron] sweep failed', err)
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
