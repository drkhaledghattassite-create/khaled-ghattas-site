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
  buildPostPurchaseText,
  type PostPurchaseBookEntry,
  type PostPurchaseLocale,
  type PostPurchaseSessionEntry,
} from '@/lib/email/templates/post-purchase'
import { storage } from '@/lib/storage'
import { SITE_URL } from '@/lib/constants'

export const runtime = 'nodejs'

const POST_PURCHASE_LINK_EXPIRY_DAYS = 7
const POST_PURCHASE_LINK_EXPIRY_SECONDS = POST_PURCHASE_LINK_EXPIRY_DAYS * 24 * 60 * 60

// Public support inbox shown in the email footer. Override via env so we can
// route post-purchase replies to a different inbox than the corporate one if
// needed; default mirrors the team address used elsewhere on the site.
const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ?? 'kamallchhimi@gmail.com'

function pickPublicImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Resolve site-relative paths ("/Paid books/x.jpg") against SITE_URL so
  // email clients can fetch them from the production origin. Anything else
  // is parsed as-is and validated for protocol + non-localhost host.
  let parsed: URL
  try {
    parsed = trimmed.startsWith('/')
      ? new URL(trimmed, SITE_URL)
      : new URL(trimmed)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  const host = parsed.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
    return null
  }
  return parsed.toString()
}

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
          // Locale: not currently passed through Stripe metadata (the
          // checkout route doesn't forward it yet). Default to AR — the
          // site's default locale. Wiring `locale` through metadata in
          // app/api/checkout/route.ts is a one-line follow-up that
          // unlocks EN emails without further changes here.
          const rawLocale = session.metadata?.locale
          const locale: PostPurchaseLocale =
            rawLocale === 'en' ? 'en' : 'ar'
          await sendPostPurchaseEmail({
            orderId: createdOrder.id,
            customerEmail,
            customerName,
            userId: createdOrder.userId,
            totalAmount: createdOrder.totalAmount,
            currency: createdOrder.currency,
            locale,
          })
        } catch (err) {
          console.error('[stripe/webhook] post-purchase email failed', {
            orderId: createdOrder.id,
            email: customerEmail,
            err,
          })
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
 * Empty-items edge case: the email STILL sends — the template renders an
 * apology block instead of the delivery sections. This matches the spec:
 * the order is recorded, the customer was charged, they should receive
 * acknowledgement with a path to support.
 *
 * Errors are caught by the caller; this fn is allowed to throw.
 */
async function sendPostPurchaseEmail(args: {
  orderId: string
  customerEmail: string
  customerName: string | null
  userId: string | null
  totalAmount: string
  currency: string
  locale: PostPurchaseLocale
}): Promise<void> {
  const items = await getOrderItemsWithBooks(args.orderId)
  if (items.length === 0) {
    // Loud log — this isn't supposed to happen — but the apology email
    // still goes out. The customer was charged; silence is worse than a
    // generic acknowledgement.
    console.error(
      '[stripe/webhook] order has zero items — sending apology email',
      { orderId: args.orderId },
    )
  }

  // userId is required by the storage adapter signature even though the mock
  // doesn't use it. Fall back to the customer email when no account is linked
  // (guest checkout — not supported today, but we hedge against future
  // changes rather than silently passing an empty string).
  const ownerId = args.userId ?? `guest:${args.customerEmail}`

  const books: PostPurchaseBookEntry[] = []
  const sessions: PostPurchaseSessionEntry[] = []

  for (const { item, book } of items) {
    const coverImageUrl = pickPublicImageUrl(book.coverImage)
    if (book.productType === 'SESSION') {
      sessions.push({
        titleAr: book.titleAr,
        titleEn: book.titleEn,
        coverImageUrl,
        currency: book.currency || args.currency,
        priceAtPurchase: item.priceAtPurchase,
      })
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
        // Per-book failure: render the "available shortly" note in the
        // template instead of breaking the whole email.
        console.error('[stripe/webhook] storage.getSignedUrl failed for book', {
          orderId: args.orderId,
          bookId: book.id,
          err,
        })
      }
    }
    books.push({
      titleAr: book.titleAr,
      titleEn: book.titleEn,
      coverImageUrl,
      currency: book.currency || args.currency,
      priceAtPurchase: item.priceAtPurchase,
      downloadUrl,
    })
  }

  const templateInput = {
    locale: args.locale,
    customerName: args.customerName,
    customerEmail: args.customerEmail,
    orderId: args.orderId,
    totalAmount: args.totalAmount,
    currency: args.currency,
    books,
    sessions,
    libraryUrl: `${SITE_URL}/dashboard/library`,
    signedUrlExpiresInDays: POST_PURCHASE_LINK_EXPIRY_DAYS,
    supportEmail: SUPPORT_EMAIL,
  }

  const html = buildPostPurchaseHtml(templateInput)
  const text = buildPostPurchaseText(templateInput)

  const result = await sendEmail({
    to: args.customerEmail,
    subject: buildPostPurchaseSubject(args.locale),
    html,
    text,
    previewLabel: 'post-purchase',
  })

  if (!result.ok) {
    // 'preview-only' is the dev short-circuit — log at info, not warn.
    if (result.reason === 'preview-only') {
      console.info('[stripe/webhook] post-purchase email previewed (dev)', {
        orderId: args.orderId,
        email: args.customerEmail,
      })
      return
    }
    console.warn('[stripe/webhook] post-purchase email not sent', {
      orderId: args.orderId,
      email: args.customerEmail,
      reason: result.reason,
    })
    return
  }
  console.info('[stripe/webhook] post-purchase email sent', {
    orderId: args.orderId,
    emailId: result.id,
  })
}
