import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'
import { getOrderById, updateOrderStatus } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { apiError, errInternal, errNotFound, parseJsonBody } from '@/lib/api/errors'
import { getStripe } from '@/lib/stripe'

const ordersStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'FULFILLED', 'REFUNDED', 'FAILED']),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  const body = await parseJsonBody(req, ordersStatusSchema)
  if (!body.ok) return body.response

  const nextStatus = body.data.status

  const order = await getOrderById(id)
  if (!order) return errNotFound('Order not found.')

  // REFUNDED is the only transition with a real-world side effect: actually
  // tell Stripe to return the money. Do the Stripe call BEFORE the DB update
  // — if Stripe rejects, the local row stays as PAID/FULFILLED and the admin
  // sees the real error instead of a misleading "saved" toast.
  if (nextStatus === 'REFUNDED' && order.status !== 'REFUNDED') {
    if (!order.stripePaymentIntentId) {
      return apiError(
        'VALIDATION',
        'Order has no Stripe payment intent — cannot issue a refund through the panel.',
      )
    }
    const stripe = getStripe()
    if (!stripe) {
      return apiError('INTERNAL', 'Stripe is not configured.', { status: 503 })
    }
    try {
      await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId })
    } catch (err) {
      // "already refunded" → treat as success, just sync our local row below.
      if (
        err instanceof Stripe.errors.StripeInvalidRequestError &&
        err.code === 'charge_already_refunded'
      ) {
        console.info(
          '[api/admin/orders PATCH] Stripe says already refunded; syncing local status',
          { orderId: id, paymentIntentId: order.stripePaymentIntentId },
        )
      } else {
        console.error('[api/admin/orders PATCH] stripe refund failed', err)
        const detail =
          err instanceof Stripe.errors.StripeError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Unknown Stripe error.'
        return apiError(
          'INTERNAL',
          process.env.NODE_ENV === 'production'
            ? 'Stripe refused to refund this charge.'
            : `Stripe refused to refund this charge: ${detail}`,
          { status: 502 },
        )
      }
    }
  }

  try {
    const row = await updateOrderStatus(id, nextStatus)
    return NextResponse.json({ ok: true, order: row })
  } catch (err) {
    console.error('[api/admin/orders PATCH]', err)
    return errInternal('Could not update order.')
  }
}
