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
import {
  getSessionItemById,
  saveMediaProgress,
  userOwnsProduct,
} from '@/lib/db/queries'

// This endpoint is a keepalive-friendly twin of saveSessionItemProgressAction.
// The session viewer's debounced in-page saves continue to use the server
// action, but the unmount/pagehide flush calls fetch with
// `keepalive: true` against this route — that flag is what keeps the
// request alive while the tab is being torn down. Server actions cannot
// be invoked with keepalive (Next.js's encrypted-id action runtime
// cancels in-flight POSTs on tab teardown). See Phase 2's
// /api/reader/progress for the same pattern.
export const dynamic = 'force-dynamic'

const inputSchema = z.object({
  sessionId: z.string().min(1).max(64),
  itemId: z.string().min(1).max(64),
  positionSeconds: z.number().int().min(0).max(60 * 60 * 24),
  completed: z.boolean(),
})

/**
 * POST /api/session/progress
 *
 * Persists `last position` for an owned session item. Mirrors
 * saveSessionItemProgressAction but is callable via fetch + keepalive so
 * unmount-time saves survive tab-close. Same security: origin check +
 * auth + ownership re-verify + cross-session-item guard + per-user rate
 * limit. Returns 200 { ok: true } on success; the client treats any
 * non-200 as "save didn't land" and silently degrades.
 */
export async function POST(req: Request) {
  const originErr = assertSameOrigin(req)
  if (originErr) return originErr

  const session = await getServerSession()
  if (!session) return errUnauthorized('Sign in required.')

  const body = await parseJsonBody(req, inputSchema)
  if (!body.ok) return body.response

  const userId = session.user.id

  // Per-user rate limit. The viewer debounces saves to one per ~1.5s during
  // playback, but a flurry of unmount + pagehide + tab-switch events can
  // cluster — generous ceiling matches the reader-progress pattern.
  const rl = await tryRateLimit(`session-progress:${userId}`)
  if (!rl.ok) {
    const res = apiError('RATE_LIMITED', 'Too many requests.')
    for (const [k, v] of Object.entries(rl.headers)) res.headers.set(k, v)
    return res
  }

  try {
    const owns = await userOwnsProduct(userId, body.data.sessionId)
    if (!owns) return errForbidden('You do not own this content.')

    // Cross-session-item guard — see saveSessionItemProgressAction for
    // the rationale. An attacker with another session's item id should
    // not be able to write progress against this user via this route.
    const item = await getSessionItemById(body.data.itemId, body.data.sessionId)
    if (!item) return errForbidden('Item does not belong to this session.')

    await saveMediaProgress(
      userId,
      body.data.itemId,
      body.data.positionSeconds,
      body.data.completed,
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/session/progress]', err)
    return errInternal('Could not save session progress.')
  }
}
