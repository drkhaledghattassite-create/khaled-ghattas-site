import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'

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
      // TODO(phase-6): create order rows from session.line_items.
      // const session = event.data.object as Stripe.Checkout.Session
      // await createOrderFromSession(session)
      console.info('[stripe/webhook] checkout.session.completed (no-op)')
      break
    }
    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
    case 'charge.refunded': {
      // TODO(phase-6): mirror payment status onto the order row.
      console.info(`[stripe/webhook] ${event.type} (no-op)`)
      break
    }
    default:
      console.info(`[stripe/webhook] unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
