import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/server'
import { getGiftByStripeSessionId } from '@/lib/db/queries'
import { errUnauthorized, errInternal } from '@/lib/api/errors'
import { SITE_URL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

/**
 * Light read endpoint used by /gifts/success's client poller while the
 * Stripe webhook flips PENDING → CLAIMED (or stays PENDING for the
 * recipient-claim window).
 *
 * Returns:
 *   { status: 'READY' | 'PENDING' | 'NOT_FOUND', claimUrl?, recipientEmail?, expiresAt? }
 *
 * READY means the gift row exists and is shareable. PENDING means the
 * session_id was passed but no gift row has been created by the webhook
 * yet — the poller keeps trying. NOT_FOUND means missing or not owned by
 * this signed-in user.
 *
 * Auth + ownership-gated to senderUserId. Mirrors the booking-order-status
 * pattern (we never confirm or deny the existence of a session_id to a
 * non-owner — cross-user probes return NOT_FOUND).
 *
 * Phase H R-4 — response shape change:
 *   Previously emitted the raw 256-bit `token`. Even though the claim
 *   action gates on emailVerified + recipientEmail match (Phase H B-1),
 *   handing the sender the raw token is unnecessary exposure: the only
 *   legitimate use is sharing the claim link. We now build the URL
 *   server-side and emit only that. The locale segment comes from a
 *   `locale` query param so the sender sees the URL in their language;
 *   defaults to 'ar' (site primary) when absent or unrecognised. The
 *   token never leaves the server in the response body.
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
  const rawLocale = url.searchParams.get('locale')
  const locale: 'ar' | 'en' = rawLocale === 'en' ? 'en' : 'ar'

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
    // Build the claim URL server-side. The token stays here and never
    // crosses the wire — only the assembled URL does. A leaked URL is
    // equivalent in capability to a leaked token, but the URL is the
    // only thing senders ever need; carrying the raw token added
    // surface for no benefit (sender-facing analytics, logs, dev
    // tools, etc.).
    const claimUrl = `${SITE_URL}/${locale}/gifts/claim?token=${encodeURIComponent(gift.token)}`
    return NextResponse.json({
      status: 'READY' as const,
      giftId: gift.id,
      claimUrl,
      recipientEmail: gift.recipientEmail,
      expiresAt: gift.expiresAt.toISOString(),
      giftStatus: gift.status,
    })
  } catch (err) {
    console.error('[api/gifts/status]', err)
    return errInternal('Could not check gift status.')
  }
}
