import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  apiError,
  errForbidden,
  errInternal,
  errUnauthorized,
  parseJsonBody,
} from '@/lib/api/errors'
import { assertSameOrigin } from '@/lib/api/origin'
import { getServerSession } from '@/lib/auth/server'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import { saveReadingProgress, userOwnsProduct } from '@/lib/db/queries'

// This endpoint is a keepalive-friendly twin of saveProgressAction. The
// reader's debounced in-page saves continue to use the server action, but
// the unmount/pagehide flush calls fetch with `keepalive: true` against
// this route — that flag is what keeps the request alive while the tab is
// being torn down. Server actions cannot be invoked with keepalive (they
// require the framework's encrypted-id RPC plumbing), so we mirror the
// shape of the action here.
export const dynamic = 'force-dynamic'

const inputSchema = z.object({
  // Keep the same shape and bounds as saveProgressAction so the route
  // can't be used to bypass server-side validation.
  bookId: z.string().min(1).max(64),
  page: z.number().int().min(1).max(10000),
  // Optional — see saveProgressAction for the rationale on why this
  // can be undefined (early keepalive flush before document load).
  totalPages: z.number().int().min(0).max(10000).optional(),
})

/**
 * POST /api/reader/progress
 *
 * Persists `last page read` for an owned book. Mirrors saveProgressAction
 * but is callable via fetch + keepalive so unmount-time saves survive
 * tab-close. Same security: origin check + auth + ownership re-verify +
 * per-user rate limit.
 *
 * Returns 200 { ok: true } on success. Failures are logged server-side and
 * returned as standard apiError shapes; the client treats any non-200 as
 * "save didn't land" and silently degrades.
 */
export async function POST(req: Request) {
  const originErr = assertSameOrigin(req)
  if (originErr) return originErr

  const session = await getServerSession()
  if (!session) return errUnauthorized('Sign in required.')

  const body = await parseJsonBody(req, inputSchema)
  if (!body.ok) return body.response

  const userId = session.user.id

  // Per-user rate limit. The reader debounces saves to one per 500ms during
  // normal reading, but a flurry of unmount + pagehide + tab-switch events
  // can cluster — set a generous ceiling (60/min) that will only be hit by
  // pathological behavior.
  const rl = await tryRateLimit(`reader-progress:${userId}`)
  if (!rl.ok) {
    const res = apiError('RATE_LIMITED', 'Too many requests.')
    for (const [k, v] of Object.entries(rl.headers)) res.headers.set(k, v)
    return res
  }

  try {
    const owns = await userOwnsProduct(userId, body.data.bookId)
    if (!owns) return errForbidden('You do not own this content.')

    await saveReadingProgress(
      userId,
      body.data.bookId,
      body.data.page,
      body.data.totalPages,
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/reader/progress]', err)
    return errInternal('Could not save reading progress.')
  }
}
