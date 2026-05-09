import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/server'
import { getBookingOrderByStripeSessionId } from '@/lib/db/queries'
import { errUnauthorized, errInternal } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

/**
 * Light read endpoint used by the booking success page's client poller
 * while the Stripe webhook flips PENDING → PAID.
 *
 * Returns:
 *   { status: 'PAID' | 'PENDING' | 'NOT_FOUND', orderId?: string }
 *
 * Auth-gated — the success page is for the authenticated buyer only.
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
    const order = await getBookingOrderByStripeSessionId(sessionId)
    if (!order) {
      return NextResponse.json(
        { status: 'NOT_FOUND' as const },
        { status: 200 },
      )
    }
    // Defensive: ensure the polling user owns the order they're asking
    // about. Otherwise return NOT_FOUND rather than 403 — the result is
    // the same shape and avoids leaking that the session_id exists.
    if (order.userId && order.userId !== session.user.id) {
      return NextResponse.json(
        { status: 'NOT_FOUND' as const },
        { status: 200 },
      )
    }
    return NextResponse.json({
      status: order.status === 'PAID' ? 'PAID' : 'PENDING',
      orderId: order.id,
    })
  } catch (err) {
    console.error('[api/booking/order-status]', err)
    return errInternal('Could not check order status.')
  }
}
