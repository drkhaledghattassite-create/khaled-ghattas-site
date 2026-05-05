'use server'

/**
 * Server actions for the customer-facing session viewer (Phase 4).
 *
 * Why server actions and not route handlers:
 *   - Type-safe end to end — the client imports the function directly.
 *   - Encrypted action ids carry CSRF protection out of the box.
 *
 * Why we never throw: failing to save playback progress is non-blocking.
 * The user is mid-watch; an error toast would be more disruptive than the
 * lost few seconds. The viewer treats `{ ok: false }` as a no-op.
 *
 * Note on the keepalive twin: server actions cannot be invoked with
 * `fetch(..., { keepalive: true })`. The unmount/pagehide flush goes
 * through `/api/session/progress` instead — same shape, same auth +
 * ownership + cross-session checks. See the route file's header for the
 * full rationale (mirrors what Phase 2 did with /api/reader/progress).
 */

import { z } from 'zod'
import { getServerSession } from '@/lib/auth/server'
import {
  getSessionItemById,
  saveMediaProgress,
  userOwnsProduct,
} from '@/lib/db/queries'

// session_item id covers UUID (36) plus the dev placeholder ids used in
// mock mode; sessionId is a books.id with productType='SESSION'.
const idSchema = z.string().min(1).max(64)

const progressInputSchema = z.object({
  sessionId: idSchema,
  itemId: idSchema,
  // 24h cap — anything above is almost certainly a bad input. Matches the
  // duration cap in the admin session-content action.
  positionSeconds: z.number().int().min(0).max(60 * 60 * 24),
  completed: z.boolean(),
})

export async function saveSessionItemProgressAction(input: {
  sessionId: string
  itemId: string
  positionSeconds: number
  completed: boolean
}): Promise<{ ok: boolean }> {
  try {
    const parsed = progressInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false }

    const session = await getServerSession()
    if (!session) return { ok: false }
    const userId = session.user.id

    // Ownership re-check — never trust the client to gate its own writes.
    const owns = await userOwnsProduct(userId, parsed.data.sessionId)
    if (!owns) return { ok: false }

    // Cross-session guard — make sure the itemId belongs to this session.
    // Without this, an attacker who knows another session's item id could
    // pivot and overwrite progress for content they don't own. The
    // ownership check above already protects this user's data, but we
    // also want the (userId, otherItemId) row to never be written.
    const item = await getSessionItemById(
      parsed.data.itemId,
      parsed.data.sessionId,
    )
    if (!item) return { ok: false }

    await saveMediaProgress(
      userId,
      parsed.data.itemId,
      parsed.data.positionSeconds,
      parsed.data.completed,
    )
    return { ok: true }
  } catch (err) {
    console.error('[saveSessionItemProgressAction]', err)
    return { ok: false }
  }
}
