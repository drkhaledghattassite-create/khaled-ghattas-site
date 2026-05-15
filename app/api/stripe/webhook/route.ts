import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import {
  createOrderFromStripeSession,
  deleteHoldByStripeSessionId,
  getBookingById,
  getBookingOrderByStripeSessionId,
  getGiftByStripeSessionId,
  getOrderByPaymentIntentId,
  markBookingOrderFailed,
  markBookingOrderPaid,
  markBookingOrderRefunded,
  markGiftBookingOrderPaid,
  markGiftEmailSent,
  markGiftRefunded,
  recordStripeEvent,
  setGiftStripePaymentIntent,
  updateOrderStatusByPaymentIntentId,
  type Gift,
} from '@/lib/db/queries'
import { sendEmail } from '@/lib/email/send'
import { sendPostPurchaseEmail } from '@/lib/email/send-post-purchase'
import type { PostPurchaseLocale } from '@/lib/email/templates/post-purchase'
import {
  buildBookingConfirmationHtml,
  buildBookingConfirmationSubject,
  buildBookingConfirmationText,
  type BookingConfirmationLocale,
} from '@/lib/email/templates/booking-confirmation'
import {
  buildGiftSentHtml,
  buildGiftSentSubject,
  buildGiftSentText,
} from '@/lib/email/templates/gift-sent'
import {
  buildGiftRevokedHtml,
  buildGiftRevokedSubject,
  buildGiftRevokedText,
} from '@/lib/email/templates/gift-revoked'
import { createUserPurchaseGiftFromWebhook, sendGiftReceivedEmail } from '@/app/[locale]/(public)/gifts/actions'
import { resolveGiftItemPrice, type GiftableItemType, getUserById } from '@/lib/db/queries'
import { SITE_URL } from '@/lib/constants'
import { resolvePublicUrl } from '@/lib/storage/public-url'
import type { GiftDisplayItem, GiftEmailLocale } from '@/lib/email/templates/gift-shared'

export const runtime = 'nodejs'

// Public support inbox shown in the email footer. Override via env so we can
// route post-purchase replies to a different inbox than the corporate one if
// needed; default mirrors the team address used elsewhere on the site.
const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ?? 'Team@drkhaledghattass.com'

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

  // QA P2 — event-level idempotency. The per-branch SQL guards already
  // make most flows safe under duplicate delivery, but Stripe sometimes
  // re-delivers DIFFERENT events for the same payment (refund → reversal,
  // etc.) and those guards don't know about prior events. Stamp this
  // event id; if we've already processed it, ack with 200 and skip.
  const isFirstDelivery = await recordStripeEvent({
    eventId: event.id,
    eventType: event.type,
  })
  if (!isFirstDelivery) {
    console.info('[stripe/webhook] duplicate event delivery — skipping', {
      eventId: event.id,
      eventType: event.type,
    })
    return NextResponse.json({ received: true, deduplicated: true })
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

      // GIFT product type (Phase D) — same early-return precedent as BOOKING.
      // Gift checkout completion creates the gifts row (and a linked
      // booking_orders row when itemType=BOOKING), then sends both the
      // gift_received and gift_sent emails best-effort.
      if (session.metadata?.productType === 'GIFT') {
        await handleGiftCheckoutCompleted(session)
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
        // QA P2 — never 500 on duplicate webhook delivery. With the new
        // partial unique index `orders_stripe_session_idx` (migration 0013),
        // ON CONFLICT DO NOTHING in createOrderFromStripeSession is the
        // only path that ever lands here on duplicate — a transient DB
        // blip is the realistic remaining cause. Stripe retries with
        // exponential backoff on 5xx, so returning 500 turned one bad
        // moment into a retry storm. Log + acknowledge with 200; the
        // missing order will surface in admin and be reconciled out-of-band.
        console.error('[stripe/webhook] failed to record order; ack 200 to halt Stripe retries', err)
        return NextResponse.json({ received: true, deferred: true })
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
      const productType = session.metadata?.productType
      if (productType === 'GIFT') {
        // Gift checkout expired without payment. The gift row is only created
        // on `checkout.session.completed`, so there's nothing in `gifts` to
        // mark. We DO need to release any BOOKING hold the action created up
        // front (the action calls createBookingHold + setHoldStripeSessionId
        // BEFORE Stripe checkout for itemType=BOOKING).
        try {
          await deleteHoldByStripeSessionId(session.id)
          console.info(
            '[stripe/webhook] checkout.session.expired (GIFT) — hold released',
            { sessionId: session.id },
          )
        } catch (err) {
          console.error(
            '[stripe/webhook] failed to release GIFT hold',
            err,
          )
        }
        break
      }
      if (productType !== 'BOOKING') {
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

      // GIFT-flavored branch first. We look up by paymentIntentId by joining
      // through the booking_order's gift_id (BOOKING gifts) or by direct
      // paymentIntentId match on the gifts row (BOOK / SESSION gifts). For
      // simplicity, the gifts row stores stripePaymentIntentId at completion
      // time — we look up by sessionId via the charge → invoice path, but
      // Stripe's charge payload includes payment_intent. We hop session →
      // gift via getGiftByStripeSessionId after fetching the session — but
      // we don't have it here. Practical path: find the gift by joining
      // the bookingOrders → gifts. Simpler: store paymentIntentId on the
      // gift, search by it.
      const refundedGift = await refundGiftByPaymentIntent(paymentIntentId)
      if (refundedGift) {
        console.info(
          '[stripe/webhook] charge.refunded → GIFT REFUNDED',
          { giftId: refundedGift.id },
        )
        break
      }

      // BOOKING-flavored branch second. markBookingOrderRefunded returns null
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
      // GIFT events on payment_failed are no-ops because gifts are only
      // created on checkout.session.completed, after which payment failure
      // cannot occur. If a gift somehow needs voiding, use the admin
      // revoke flow.
      //
      // BOOKING next. We don't currently store paymentIntentId on
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
      // QA P2 — guard against delayed failure events overwriting terminal
      // success state. Stripe's payment_intent state machine is supposed to
      // be terminal at `succeeded`, but in rare cases (off-session retries,
      // disputed authorizations) a `payment_failed` event can arrive after a
      // PAID transition. Treat PAID as terminal here too — chargebacks/
      // disputes should flow through the admin tooling, not this fast-path
      // auto-flip.
      if (
        existing.status === 'FAILED' ||
        existing.status === 'REFUNDED' ||
        existing.status === 'PAID'
      ) break
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
    // The UPDATE is gated on `status='PENDING'`, so a null result here means
    // a sibling webhook delivery already processed this session (concurrent
    // retry) — there's nothing to do. The outer `existing.status === 'PAID'`
    // check usually catches re-delivery, but two truly concurrent deliveries
    // can both pass it; this is the second-line defense. Drop the hold
    // defensively in case the prior delivery raced past it, then return
    // success so Stripe stops retrying.
    console.info(
      '[stripe/webhook] BOOKING already processed (race) — no-op',
      { sessionId },
    )
    await deleteHoldByStripeSessionId(sessionId)
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
      emailType: 'booking_confirmation',
      relatedEntityType: 'booking_order',
      relatedEntityId: result.bookingOrder.id,
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

/* ──────────────────────────────────────────────────────────────────────────
 * GIFT — Phase D
 *
 * Gift checkout completion creates the gift row + (for BOOKING gifts) flips
 * the linked booking_orders row from PENDING → PAID. Then sends both the
 * recipient gift_received email and the sender gift_sent email best-effort.
 *
 * Idempotency: getGiftByStripeSessionId() guards against duplicate Stripe
 * deliveries (the unique partial index on stripe_session_id ensures the
 * createGift call would fail if we tried to insert twice anyway, but the
 * read-first path lets us surface a clean log line + skip the email
 * resend instead of erroring out).
 * ──────────────────────────────────────────────────────────────────────── */

const GIFTABLE_SET = new Set<GiftableItemType>(['BOOK', 'SESSION', 'BOOKING'])

function pickEmailItemUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  let parsed: URL
  try {
    parsed = trimmed.startsWith('/') ? new URL(trimmed, SITE_URL) : new URL(trimmed)
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

async function handleGiftCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const sessionId = session.id

  // Idempotency guard.
  const existing = await getGiftByStripeSessionId(sessionId)
  if (existing) {
    console.info('[stripe/webhook] GIFT already processed — skipping', {
      sessionId,
      giftId: existing.id,
    })
    // Defensive: drop the BOOKING hold if any.
    await deleteHoldByStripeSessionId(sessionId)
    return
  }

  const md = session.metadata ?? {}
  const itemTypeRaw = md.giftItemType
  const itemType =
    typeof itemTypeRaw === 'string' && GIFTABLE_SET.has(itemTypeRaw as GiftableItemType)
      ? (itemTypeRaw as GiftableItemType)
      : null
  const itemId = typeof md.giftItemId === 'string' ? md.giftItemId : null
  const senderUserId = typeof md.senderUserId === 'string' ? md.senderUserId : null
  const recipientEmail =
    typeof md.recipientEmail === 'string' ? md.recipientEmail.trim().toLowerCase() : null
  const senderMessage =
    typeof md.senderMessage === 'string' && md.senderMessage.trim()
      ? md.senderMessage.trim()
      : null
  const localeRaw = md.locale
  const locale: GiftEmailLocale = localeRaw === 'en' ? 'en' : 'ar'
  const totalCents = session.amount_total ?? 0
  const currency = session.currency ?? 'usd'
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null

  if (!itemType || !itemId || !senderUserId || !recipientEmail) {
    console.warn(
      '[stripe/webhook] GIFT completed but metadata incomplete — skipping',
      { sessionId, hasItemType: !!itemType, hasItemId: !!itemId, hasSender: !!senderUserId, hasRecipient: !!recipientEmail },
    )
    // For BOOKING gifts, release the hold so capacity returns.
    await deleteHoldByStripeSessionId(sessionId)
    return
  }

  // Create the gift row + (BOOKING) booking_order shell.
  const created = await createUserPurchaseGiftFromWebhook({
    itemType,
    itemId,
    senderUserId,
    recipientEmail,
    senderMessage,
    locale,
    amountCents: totalCents,
    currency,
    stripeSessionId: sessionId,
    stripePaymentIntentId: paymentIntentId,
    holdId: typeof md.holdId === 'string' ? md.holdId : null,
  })
  if (!created) {
    console.error('[stripe/webhook] GIFT createUserPurchaseGiftFromWebhook failed', {
      sessionId,
    })
    return
  }
  console.info('[stripe/webhook] GIFT created', {
    sessionId,
    giftId: created.id,
    itemType,
  })

  // For BOOKING gifts, mark the linked booking_order as PAID + bump bookedCount.
  if (itemType === 'BOOKING') {
    const paid = await markGiftBookingOrderPaid({
      giftId: created.id,
      stripeSessionId: sessionId,
      stripePaymentIntentId: paymentIntentId,
      amountPaid: totalCents,
    })
    if (!paid) {
      console.warn('[stripe/webhook] GIFT booking_order not promoted to PAID', {
        sessionId,
        giftId: created.id,
      })
    } else {
      console.info('[stripe/webhook] GIFT booking_order PAID', {
        sessionId,
        bookingOrderId: paid.bookingOrderId,
        flippedToSoldOut: paid.flippedToSoldOut,
      })
    }
  }

  // Persist the paymentIntentId on the gift even if it wasn't set at insert.
  if (paymentIntentId) {
    await setGiftStripePaymentIntent(created.id, paymentIntentId)
  }

  // Send the gift_received email to the recipient.
  try {
    const result = await sendGiftReceivedEmail(created)
    await markGiftEmailSent(
      created.id,
      result.ok,
      result.ok ? null : result.reason,
    )
  } catch (err) {
    console.error('[stripe/webhook] gift_received email failed', err)
    await markGiftEmailSent(created.id, false, 'unknown_error')
  }

  // Send the gift_sent email to the sender — best-effort.
  try {
    const sender = await getUserById(senderUserId)
    if (!sender) {
      console.warn('[stripe/webhook] GIFT sender row not found for email', {
        senderUserId,
      })
      return
    }
    const itemSummary = await resolveGiftItemPrice(itemType, itemId)
    if (!itemSummary) return
    // Phase F2 — resolve the cover storage key first so the host-allowlist
    // guard `pickEmailItemUrl` (which `new URL`s the input) sees an absolute
    // URL. Bare R2 keys throw on `new URL` and would silently drop the cover.
    const resolvedItemCover = await resolvePublicUrl(itemSummary.coverImage)
    const item: GiftDisplayItem = {
      itemType,
      titleAr: itemSummary.titleAr,
      titleEn: itemSummary.titleEn,
      coverImageUrl: pickEmailItemUrl(resolvedItemCover),
    }
    const claimUrl = `${SITE_URL}/${locale}/gifts/claim?token=${encodeURIComponent(created.token)}`
    const dashboardUrl = `${SITE_URL}/${locale}/dashboard/gifts`
    const html = buildGiftSentHtml({
      locale,
      senderEmail: sender.email,
      senderName: sender.name,
      recipientEmail,
      item,
      amountCents: totalCents,
      currency,
      claimUrl,
      dashboardUrl,
      expiresAt: created.expiresAt,
      supportEmail: SUPPORT_EMAIL,
    })
    const text = buildGiftSentText({
      locale,
      senderEmail: sender.email,
      senderName: sender.name,
      recipientEmail,
      item,
      amountCents: totalCents,
      currency,
      claimUrl,
      dashboardUrl,
      expiresAt: created.expiresAt,
      supportEmail: SUPPORT_EMAIL,
    })
    await sendEmail({
      to: sender.email,
      subject: buildGiftSentSubject(locale, recipientEmail),
      html,
      text,
      previewLabel: 'gift-sent',
      emailType: 'gift_sent',
      relatedEntityType: 'gift',
      relatedEntityId: created.id,
    })
  } catch (err) {
    console.error('[stripe/webhook] gift_sent email failed', err)
  }
}

async function refundGiftByPaymentIntent(
  paymentIntentId: string,
): Promise<Gift | null> {
  // Look up the gift via paymentIntentId. We persist it on the gifts row
  // at completion time (see setGiftStripePaymentIntent + the createGift
  // input), so a direct match is sufficient.
  try {
    const { db } = await import('@/lib/db')
    const { gifts } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const [row] = await db
      .select()
      .from(gifts)
      .where(eq(gifts.stripePaymentIntentId, paymentIntentId))
      .limit(1)
    if (!row) return null
    const refunded = await markGiftRefunded(row.id)
    if (!refunded) return null
    // Send revoke/refund emails best-effort.
    try {
      const itemSummary = await resolveGiftItemPrice(
        refunded.itemType === 'TEST' ? 'BOOK' : (refunded.itemType as GiftableItemType),
        refunded.itemId,
      )
      if (itemSummary) {
        const locale: GiftEmailLocale = refunded.locale === 'en' ? 'en' : 'ar'
        // Phase F2 — see twin comment in handleGiftCheckoutCompleted.
        const resolvedRefundCover = await resolvePublicUrl(itemSummary.coverImage)
        const item: GiftDisplayItem = {
          itemType: itemSummary.itemType,
          titleAr: itemSummary.titleAr,
          titleEn: itemSummary.titleEn,
          coverImageUrl: pickEmailItemUrl(resolvedRefundCover),
        }
        await sendEmail({
          to: refunded.recipientEmail,
          subject: buildGiftRevokedSubject(locale, 'REFUNDED'),
          html: buildGiftRevokedHtml({
            locale,
            toEmail: refunded.recipientEmail,
            audience: 'recipient',
            kind: 'REFUNDED',
            item,
            reason: null,
            supportEmail: SUPPORT_EMAIL,
          }),
          text: buildGiftRevokedText({
            locale,
            toEmail: refunded.recipientEmail,
            audience: 'recipient',
            kind: 'REFUNDED',
            item,
            reason: null,
            supportEmail: SUPPORT_EMAIL,
          }),
          previewLabel: 'gift-refunded-recipient',
          emailType: 'gift_revoked',
          relatedEntityType: 'gift',
          relatedEntityId: refunded.id,
        })
        if (refunded.senderUserId) {
          const sender = await getUserById(refunded.senderUserId)
          if (sender) {
            await sendEmail({
              to: sender.email,
              subject: buildGiftRevokedSubject(locale, 'REFUNDED'),
              html: buildGiftRevokedHtml({
                locale,
                toEmail: sender.email,
                audience: 'sender',
                kind: 'REFUNDED',
                item,
                reason: null,
                supportEmail: SUPPORT_EMAIL,
              }),
              text: buildGiftRevokedText({
                locale,
                toEmail: sender.email,
                audience: 'sender',
                kind: 'REFUNDED',
                item,
                reason: null,
                supportEmail: SUPPORT_EMAIL,
              }),
              previewLabel: 'gift-refunded-sender',
              emailType: 'gift_revoked',
              relatedEntityType: 'gift',
              relatedEntityId: refunded.id,
            })
          }
        }
      }
    } catch (err) {
      console.error('[stripe/webhook] gift refund email failed', err)
    }
    return refunded
  } catch (err) {
    console.error('[stripe/webhook] refundGiftByPaymentIntent failed', err)
    return null
  }
}

