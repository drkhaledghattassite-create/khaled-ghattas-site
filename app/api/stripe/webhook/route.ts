import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import {
  createOrderFromStripeSession,
  getOrderByPaymentIntentId,
  updateOrderStatusByPaymentIntentId,
} from '@/lib/db/queries'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const stripe = getStripe()
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: { code: 'NOT_CONFIGURED', message: 'Stripe not configured.' } },
      { status: 503 },
    )
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json(
      { error: { code: 'MISSING_SIGNATURE', message: 'Missing stripe-signature header.' } },
      { status: 400 },
    )
  }

  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed', err)
    return NextResponse.json(
      { error: { code: 'INVALID_SIGNATURE', message: 'Signature verification failed.' } },
      { status: 400 },
    )
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId ?? null
      const bookId = session.metadata?.bookId ?? null

      if (!bookId) {
        console.warn(
          '[stripe/webhook] checkout.session.completed missing bookId metadata; skipping order create',
          { sessionId: session.id },
        )
        break
      }

      const totalCents = session.amount_total ?? 0
      const totalAmount = (totalCents / 100).toFixed(2)
      const currency = session.currency ?? 'usd'
      const customerEmail =
        session.customer_details?.email ?? session.customer_email ?? ''
      const customerName = session.customer_details?.name ?? null
      const paymentIntentId =
        typeof session.payment_intent === 'string' ? session.payment_intent : null

      try {
        const order = await createOrderFromStripeSession({
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          userId,
          customerEmail,
          customerName,
          totalAmount,
          currency,
          items: [
            { bookId, quantity: 1, priceAtPurchase: totalAmount },
          ],
        })
        console.info(
          `[stripe/webhook] checkout.session.completed processed (orderId=${order?.id ?? 'unknown'})`,
        )
      } catch (err) {
        console.error('[stripe/webhook] failed to record order', err)
        return NextResponse.json(
          { error: { code: 'INTERNAL', message: 'Failed to record order.' } },
          { status: 500 },
        )
      }
      break
    }

    // Stripe-side refund (manual via dashboard, or echo of an admin-panel refund).
    // Idempotent: if already REFUNDED locally, the SQL UPDATE is a no-op.
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId =
        typeof charge.payment_intent === 'string' ? charge.payment_intent : null
      if (!paymentIntentId) {
        console.warn('[stripe/webhook] charge.refunded missing payment_intent', {
          chargeId: charge.id,
        })
        break
      }
      const existing = await getOrderByPaymentIntentId(paymentIntentId)
      if (!existing) {
        console.warn('[stripe/webhook] charge.refunded for unknown order', {
          paymentIntentId,
        })
        break
      }
      if (existing.status === 'REFUNDED') {
        console.info('[stripe/webhook] charge.refunded already REFUNDED locally', {
          orderId: existing.id,
        })
        break
      }
      try {
        await updateOrderStatusByPaymentIntentId(paymentIntentId, 'REFUNDED')
        console.info('[stripe/webhook] mirrored charge.refunded → REFUNDED', {
          orderId: existing.id,
        })
      } catch (err) {
        console.error('[stripe/webhook] failed to mirror charge.refunded', err)
        return NextResponse.json(
          { error: { code: 'INTERNAL', message: 'Failed to mirror refund.' } },
          { status: 500 },
        )
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      const existing = await getOrderByPaymentIntentId(pi.id)
      if (!existing) {
        // Most failures happen before we ever wrote an order row. Nothing to do.
        console.info('[stripe/webhook] payment_intent.payment_failed; no local order', {
          paymentIntentId: pi.id,
        })
        break
      }
      if (existing.status === 'FAILED' || existing.status === 'REFUNDED') break
      try {
        await updateOrderStatusByPaymentIntentId(pi.id, 'FAILED')
        console.info('[stripe/webhook] mirrored payment_intent.payment_failed → FAILED', {
          orderId: existing.id,
        })
      } catch (err) {
        console.error('[stripe/webhook] failed to mirror payment_failed', err)
      }
      break
    }

    case 'payment_intent.succeeded': {
      // checkout.session.completed already creates the order in PAID, so this
      // is mostly a no-op echo. We only act when an order exists in PENDING.
      const pi = event.data.object as Stripe.PaymentIntent
      const existing = await getOrderByPaymentIntentId(pi.id)
      if (!existing) break
      if (existing.status !== 'PENDING') break
      try {
        await updateOrderStatusByPaymentIntentId(pi.id, 'PAID')
        console.info('[stripe/webhook] promoted PENDING → PAID', {
          orderId: existing.id,
        })
      } catch (err) {
        console.error('[stripe/webhook] failed to promote to PAID', err)
      }
      break
    }

    default:
      console.info(`[stripe/webhook] unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
