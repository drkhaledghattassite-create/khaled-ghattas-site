import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import {
  createOrderFromStripeSession,
  getOrderByPaymentIntentId,
  getOrderItemsWithBooks,
  updateOrderStatusByPaymentIntentId,
} from '@/lib/db/queries'
import { sendEmail } from '@/lib/email/send'
import {
  buildPostPurchaseHtml,
  buildPostPurchaseSubject,
  type PostPurchaseBookEntry,
  type PostPurchaseSessionEntry,
} from '@/lib/email/templates/post-purchase'
import { storage } from '@/lib/storage'
import { SITE_URL } from '@/lib/constants'

export const runtime = 'nodejs'

const POST_PURCHASE_LINK_EXPIRY_DAYS = 7
const POST_PURCHASE_LINK_EXPIRY_SECONDS = POST_PURCHASE_LINK_EXPIRY_DAYS * 24 * 60 * 60

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

      let createdOrder: Awaited<ReturnType<typeof createOrderFromStripeSession>> = null
      try {
        createdOrder = await createOrderFromStripeSession({
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
          `[stripe/webhook] checkout.session.completed processed (orderId=${createdOrder?.id ?? 'unknown'})`,
        )
      } catch (err) {
        console.error('[stripe/webhook] failed to record order', err)
        return NextResponse.json(
          { error: { code: 'INTERNAL', message: 'Failed to record order.' } },
          { status: 500 },
        )
      }

      // Post-purchase email is best-effort: an order is already recorded, and
      // Stripe expects a 200 from the webhook. If sending fails, log and move
      // on. The user can always download from /dashboard/library.
      // TODO Phase 2: queue failed emails for retry.
      if (createdOrder && customerEmail) {
        try {
          await sendPostPurchaseEmail({
            orderId: createdOrder.id,
            customerEmail,
            customerName,
            userId: createdOrder.userId,
          })
        } catch (err) {
          console.error('[stripe/webhook] post-purchase email failed', err)
        }
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

/**
 * Compose + send the post-purchase email.
 *
 * Reads back the order's items joined with their books so we can correctly
 * branch BOOK vs SESSION in the template (sessions don't get a download link,
 * just a library URL). For each BOOK with a `digitalFile` we mint a 7-day
 * signed URL via the storage adapter. Sessions and books-without-digital-file
 * get a null download URL — the template falls back to the library link.
 *
 * Errors are caught by the caller; this fn is allowed to throw.
 */
async function sendPostPurchaseEmail(args: {
  orderId: string
  customerEmail: string
  customerName: string | null
  userId: string | null
}): Promise<void> {
  const items = await getOrderItemsWithBooks(args.orderId)
  if (items.length === 0) {
    console.info('[stripe/webhook] no items for order — skipping email', {
      orderId: args.orderId,
    })
    return
  }

  // userId is required by the storage adapter signature even though the mock
  // doesn't use it. Fall back to the customer email when no account is linked
  // (guest checkout — not supported today, but we hedge against future
  // changes rather than silently passing an empty string).
  const ownerId = args.userId ?? `guest:${args.customerEmail}`

  const books: PostPurchaseBookEntry[] = []
  const sessions: PostPurchaseSessionEntry[] = []

  for (const { book } of items) {
    if (book.productType === 'SESSION') {
      sessions.push({ titleAr: book.titleAr, titleEn: book.titleEn })
      continue
    }
    let downloadUrl: string | null = null
    const storageKey = book.digitalFile?.trim()
    if (storageKey) {
      try {
        const signed = await storage.getSignedUrl({
          productType: 'BOOK',
          productId: book.id,
          storageKey,
          userId: ownerId,
          expiresInSeconds: POST_PURCHASE_LINK_EXPIRY_SECONDS,
        })
        downloadUrl = signed.url
      } catch (err) {
        console.error('[stripe/webhook] storage.getSignedUrl failed for book', {
          bookId: book.id,
          err,
        })
      }
    }
    books.push({
      titleAr: book.titleAr,
      titleEn: book.titleEn,
      downloadUrl,
    })
  }

  const html = buildPostPurchaseHtml({
    customerName: args.customerName,
    books,
    sessions,
    libraryUrl: `${SITE_URL}/dashboard/library`,
    signedUrlExpiresInDays: POST_PURCHASE_LINK_EXPIRY_DAYS,
  })

  const result = await sendEmail({
    to: args.customerEmail,
    subject: buildPostPurchaseSubject(),
    html,
  })

  if (!result.ok) {
    console.warn('[stripe/webhook] post-purchase email not sent', {
      orderId: args.orderId,
      reason: result.reason,
    })
    return
  }
  console.info('[stripe/webhook] post-purchase email sent', {
    orderId: args.orderId,
    emailId: result.id,
  })
}
