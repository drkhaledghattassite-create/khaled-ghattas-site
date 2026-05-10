import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/server'
import { getGiftByStripeSessionId } from '@/lib/db/queries'
import { errUnauthorized, errInternal } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

/**
 * Light read endpoint used by /gifts/success's client poller while the
 * Stripe webhook flips PENDING → CLAIMED (or stays PENDING for the
 * recipient-claim window).
 *
 * Returns:
 *   { status: 'READY' | 'PENDING' | 'NOT_FOUND', token?, recipientEmail?, expiresAt? }
 *
 * READY means the gift row exists and is shareable. PENDING means the
 * session_id was passed but no gift row has been created by the webhook
 * yet — the poller keeps trying. NOT_FOUND means missing or not owned by
 * this signed-in user.
 *
 * Auth + ownership-gated to senderUserId. Mirrors the booking-order-status
 * pattern (we never confirm or deny the existence of a session_id to a
 * non-owner — cross-user probes return NOT_FOUND).
 */
export async function GET(req: Request) {
  const session = await getServerSession()
  if (!session) return errUnauthorized()

  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session_id')
  if (!sessionId) {
    return NextResponse.json(
      { status: 'NOT_FOUND' as const },
      { status: 200 },
    )
  }

  try {
    const gift = await getGiftByStripeSessionId(sessionId)
    if (!gift) {
      return NextResponse.json(
        { status: 'PENDING' as const },
        { status: 200 },
      )
    }
    if (gift.senderUserId && gift.senderUserId !== session.user.id) {
      return NextResponse.json(
        { status: 'NOT_FOUND' as const },
        { status: 200 },
      )
    }
    return NextResponse.json({
      status: 'READY' as const,
      giftId: gift.id,
      token: gift.token,
      recipientEmail: gift.recipientEmail,
      expiresAt: gift.expiresAt.toISOString(),
      giftStatus: gift.status,
    })
  } catch (err) {
    console.error('[api/gifts/status]', err)
    return errInternal('Could not check gift status.')
  }
}
