import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import {
  createOrderFromStripeSession,
  deleteHoldByStripeSessionId,
  getBookingById,
  getBookingOrderByStripeSessionId,
  getOrderByPaymentIntentId,
  getOrderItemsWithBooks,
  markBookingOrderFailed,
  markBookingOrderPaid,
  markBookingOrderRefunded,
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
import {
  buildBookingConfirmationHtml,
  buildBookingConfirmationSubject,
  buildBookingConfirmationText,
  type BookingConfirmationLocale,
} from '@/lib/email/templates/booking-confirmation'
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

      // BOOKING product type — early return BEFORE the books/sessions path.
      // The existing path reads `metadata.bookId` and calls
      // createOrderFromStripeSession() which has no notion of booking_orders.
      // Falling through would either crash or write a malformed `orders` row.
      if (session.metadata?.productType === 'BOOKING') {
        await handleBookingCheckoutCompleted(session)
        break
      }

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

    // BOOKING-only: Stripe Checkout Session expired without payment. Clean up
    // the hold so the seat returns to the available pool. The booking_orders
    // row stays as PENDING — admin tooling (Phase A2) can purge stale PENDING
    // rows. Idempotent: if the hold or order is already gone, the queries
    // are no-ops.
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.metadata?.productType !== 'BOOKING') {
        // Not a booking — current books/sessions flow doesn't handle this
        // event. Log + skip.
        console.info(
          '[stripe/webhook] checkout.session.expired (non-BOOKING); skipping',
          { sessionId: session.id },
        )
        break
      }
      try {
        await deleteHoldByStripeSessionId(session.id)
        await markBookingOrderFailed({ stripeSessionId: session.id })
        console.info(
          '[stripe/webhook] checkout.session.expired (BOOKING) — hold released, order marked FAILED',
          { sessionId: session.id },
        )
      } catch (err) {
        console.error(
          '[stripe/webhook] failed to clean up expired BOOKING checkout',
          err,
        )
      }
      break
    }

    // Stripe-side refund (manual via dashboard, or echo of an admin-panel refund).
    // Routes to BOOKING handler if the paymentIntent matches a booking_order;
    // otherwise falls through to the existing books/sessions handler.
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

      // BOOKING-flavored branch first. markBookingOrderRefunded returns null
      // when no booking_orders row matches this paymentIntentId — falls
      // through to the books/sessions path. Per Decision 11, bookingState is
      // NOT auto-flipped from SOLD_OUT → OPEN on refund (admin tooling
      // territory; deferred to Phase A2).
      const refundedBooking = await markBookingOrderRefunded({
        stripePaymentIntentId: paymentIntentId,
      })
      if (refundedBooking) {
        console.info(
          '[stripe/webhook] charge.refunded → BOOKING REFUNDED, bookedCount decremented',
          { bookingOrderId: refundedBooking.id },
        )
        break
      }

      // Existing books/sessions path.
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
      // Try BOOKING first. We don't currently store paymentIntentId on
      // booking_orders before completion, so this only matches if the PI
      // was already linked (via a prior succeeded then failed sequence — rare
      // for our card-only flow, but handled defensively). If no booking_order
      // matches, fall through to the books/sessions handler.
      const failedBooking = await markBookingOrderFailed({
        stripePaymentIntentId: pi.id,
      })
      if (failedBooking) {
        console.info(
          '[stripe/webhook] payment_intent.payment_failed → BOOKING FAILED',
          { bookingOrderId: failedBooking.id },
        )
        break
      }

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

/* ──────────────────────────────────────────────────────────────────────────
 * BOOKING — Phase A1
 *
 * Handles the BOOKING-flavored checkout.session.completed:
 *   1. Mark booking_orders PAID (atomic; updates confirmedAt, paymentIntentId)
 *   2. Atomically increment bookings.bookedCount; if at capacity, flip
 *      bookingState to SOLD_OUT
 *   3. Delete the matching hold by stripeSessionId
 *   4. Send the booking-confirmation email (best-effort; same try/catch
 *      semantics as the existing post-purchase email)
 *
 * Steps 1-3 happen in a single DB transaction inside markBookingOrderPaid.
 * The webhook is idempotent: re-delivery hits an already-PAID row; the
 * UPDATE bookedCount += 1 part would over-increment, so we guard against
 * re-entry by checking order.status === 'PENDING' before doing the work.
 * ──────────────────────────────────────────────────────────────────────── */

async function handleBookingCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const sessionId = session.id
  const customerEmail =
    session.customer_details?.email ?? session.customer_email ?? ''
  const customerName = session.customer_details?.name ?? null
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null
  const totalCents = session.amount_total ?? 0

  // Idempotency guard: re-delivered webhooks would over-increment bookedCount.
  // Read the existing row; if it's already PAID, no-op.
  const existing = await getBookingOrderByStripeSessionId(sessionId)
  if (!existing) {
    console.warn(
      '[stripe/webhook] BOOKING completed but no booking_orders row',
      { sessionId },
    )
    // Best-effort: still try to delete the orphaned hold.
    await deleteHoldByStripeSessionId(sessionId)
    return
  }
  if (existing.status === 'PAID') {
    console.info('[stripe/webhook] BOOKING already PAID — skipping', {
      bookingOrderId: existing.id,
    })
    // Defensive: still drop the hold in case it was missed.
    await deleteHoldByStripeSessionId(sessionId)
    return
  }

  const result = await markBookingOrderPaid({
    stripeSessionId: sessionId,
    stripePaymentIntentId: paymentIntentId,
    amountPaid: totalCents,
  })
  if (!result) {
    console.error('[stripe/webhook] markBookingOrderPaid failed', {
      sessionId,
    })
    return
  }
  console.info('[stripe/webhook] BOOKING checkout.session.completed processed', {
    bookingOrderId: result.bookingOrder.id,
    bookingId: result.bookingId,
    newBookedCount: result.newBookedCount,
    flippedToSoldOut: result.flippedToSoldOut,
  })

  if (!customerEmail) {
    console.warn('[stripe/webhook] BOOKING confirmation: no customer email', {
      sessionId,
    })
    return
  }

  // Booking confirmation email. Best-effort — the order is already recorded
  // and capacity already adjusted; an email failure shouldn't return non-200
  // to Stripe.
  try {
    const booking = await getBookingById(result.bookingId)
    if (!booking) {
      console.error(
        '[stripe/webhook] BOOKING confirmation: booking row missing',
        { bookingId: result.bookingId },
      )
      return
    }
    const rawLocale = session.metadata?.locale
    const locale: BookingConfirmationLocale = rawLocale === 'en' ? 'en' : 'ar'

    const html = buildBookingConfirmationHtml({
      locale,
      customerName,
      customerEmail,
      orderId: result.bookingOrder.id,
      booking: {
        titleAr: booking.titleAr,
        titleEn: booking.titleEn,
        productType: booking.productType,
        cohortLabelAr: booking.cohortLabelAr,
        cohortLabelEn: booking.cohortLabelEn,
        nextCohortDate: booking.nextCohortDate,
        durationMinutes: booking.durationMinutes,
        formatAr: booking.formatAr,
        formatEn: booking.formatEn,
      },
      amountPaid: result.bookingOrder.amountPaid,
      currency: result.bookingOrder.currency,
      bookingsUrl: `${SITE_URL}/dashboard/bookings`,
      supportEmail: SUPPORT_EMAIL,
    })
    const text = buildBookingConfirmationText({
      locale,
      customerName,
      customerEmail,
      orderId: result.bookingOrder.id,
      booking: {
        titleAr: booking.titleAr,
        titleEn: booking.titleEn,
        productType: booking.productType,
        cohortLabelAr: booking.cohortLabelAr,
        cohortLabelEn: booking.cohortLabelEn,
        nextCohortDate: booking.nextCohortDate,
        durationMinutes: booking.durationMinutes,
        formatAr: booking.formatAr,
        formatEn: booking.formatEn,
      },
      amountPaid: result.bookingOrder.amountPaid,
      currency: result.bookingOrder.currency,
      bookingsUrl: `${SITE_URL}/dashboard/bookings`,
      supportEmail: SUPPORT_EMAIL,
    })

    const sendResult = await sendEmail({
      to: customerEmail,
      subject: buildBookingConfirmationSubject(locale),
      html,
      text,
      previewLabel: 'booking-confirmation',
    })
    if (!sendResult.ok) {
      if (sendResult.reason === 'preview-only') {
        console.info('[stripe/webhook] booking-confirmation previewed (dev)', {
          bookingOrderId: result.bookingOrder.id,
        })
        return
      }
      console.warn('[stripe/webhook] booking-confirmation not sent', {
        bookingOrderId: result.bookingOrder.id,
        reason: sendResult.reason,
      })
      return
    }
    console.info('[stripe/webhook] booking-confirmation email sent', {
      bookingOrderId: result.bookingOrder.id,
      emailId: sendResult.id,
    })
  } catch (err) {
    console.error('[stripe/webhook] booking-confirmation email failed', err)
  }
}
