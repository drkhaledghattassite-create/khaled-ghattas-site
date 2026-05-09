'use server'

/**
 * Server actions for the public /booking surface.
 *
 * Three actions:
 *   - createTourSuggestionAction — "I want a tour in my city" form.
 *   - createBookingInterestAction — waitlist signup for closed/sold-out
 *     bookings. Idempotent on (userId, bookingId).
 *   - createBookingCheckoutAction — pre-Stripe seat hold + Stripe Checkout
 *     Session creation. Race-free via the holds machinery in queries.ts.
 *
 * All three:
 *   - Require an authenticated session. Pages route logged-out users to
 *     /login?redirect=/booking via the existing AuthRequiredDialog +
 *     withRedirect helpers — these actions defensively double-check.
 *   - Validate input via zod. Untrusted input never reaches Drizzle.
 *   - Return discriminated unions: { ok: true, ... } | { ok: false, error }.
 *
 * SECURITY: userId is sourced from the server session, NEVER from client
 * input. All inputs are validated before they touch the DB layer.
 */

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/lib/auth/server'
import { getStripe } from '@/lib/stripe'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import { SITE_URL } from '@/lib/constants'
import {
  createBookingHold,
  createBookingOrder,
  deleteHoldById,
  getBookingById,
  getPaidBookingIdsForUser,
  setHoldStripeSessionId,
  upsertBookingInterest,
  createTourSuggestion,
} from '@/lib/db/queries'
import {
  bookingCheckoutSchema,
  bookingInterestSchema,
  tourSuggestionSchema,
  type BookingCheckoutInput,
  type BookingInterestInput,
  type TourSuggestionInput,
} from '@/lib/validators/booking'

type ActionOk<T> = { ok: true } & T
type ActionErr<E extends string> = { ok: false; error: E }

const SUPPORTED_EMAIL_LOCALES = ['ar', 'en'] as const
type EmailLocale = (typeof SUPPORTED_EMAIL_LOCALES)[number]

function normaliseEmailLocale(raw: string | undefined | null): EmailLocale {
  return SUPPORTED_EMAIL_LOCALES.includes(raw as EmailLocale)
    ? (raw as EmailLocale)
    : 'ar'
}

/**
 * Resolve the site origin in the same way the books-checkout API does.
 * Production: trust SITE_URL (NEXT_PUBLIC_APP_URL). Dev: allow Host header
 * for localhost/.local only.
 */
async function resolveOrigin(): Promise<string> {
  if (process.env.NODE_ENV === 'production') return SITE_URL
  const reqHeaders = await headers()
  const host = reqHeaders.get('host') ?? ''
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'http'
  const isDevHost =
    /^localhost(:\d+)?$/i.test(host) ||
    /^127\.0\.0\.1(:\d+)?$/.test(host) ||
    /\.local(:\d+)?$/i.test(host)
  return host && isDevHost ? `${proto}://${host}` : SITE_URL
}

/* ── Tour suggestion ─────────────────────────────────────────────────── */

export type TourSuggestionActionResult =
  | ActionOk<{ id: string }>
  | ActionErr<'unauthorized' | 'validation' | 'db_failed'>

export async function createTourSuggestionAction(
  raw: TourSuggestionInput,
): Promise<TourSuggestionActionResult> {
  const session = await getServerSession()
  if (!session) return { ok: false, error: 'unauthorized' }

  const parsed = tourSuggestionSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const row = await createTourSuggestion({
    userId: session.user.id,
    suggestedCity: parsed.data.suggestedCity,
    suggestedCountry: parsed.data.suggestedCountry,
    additionalNotes: parsed.data.additionalNotes || null,
  })
  if (!row) return { ok: false, error: 'db_failed' }
  return { ok: true, id: row.id }
}

/* ── Booking interest (waitlist) ─────────────────────────────────────── */

export type BookingInterestActionResult =
  | ActionOk<{ id: string }>
  | ActionErr<
      | 'unauthorized'
      | 'validation'
      | 'booking_not_found'
      | 'rate_limited'
      | 'db_failed'
    >

export async function createBookingInterestAction(
  raw: BookingInterestInput,
): Promise<BookingInterestActionResult> {
  const session = await getServerSession()
  if (!session) return { ok: false, error: 'unauthorized' }

  // Rate-limit per authenticated user. 20/minute is forgiving — interest
  // forms can be re-submitted with updated notes (the DB upsert is
  // idempotent on (userId, bookingId)) — but caps a UI bug or a script
  // hammering the action at a generous ceiling. Fails open when Upstash
  // isn't configured.
  const rl = await tryRateLimit(`booking-interest:${session.user.id}`, {
    limit: 20,
    window: '60 s',
  })
  if (!rl.ok) return { ok: false, error: 'rate_limited' }

  const parsed = bookingInterestSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  // Defensive: confirm the booking exists and is active before recording
  // interest. Avoids polluting the waitlist with junk bookingIds.
  const booking = await getBookingById(parsed.data.bookingId)
  if (!booking || !booking.isActive) {
    return { ok: false, error: 'booking_not_found' }
  }

  const row = await upsertBookingInterest({
    userId: session.user.id,
    bookingId: parsed.data.bookingId,
    additionalNotes: parsed.data.additionalNotes || null,
  })
  if (!row) return { ok: false, error: 'db_failed' }
  return { ok: true, id: row.id }
}

/* ── Booking checkout (Stripe + holds) ───────────────────────────────── */

export type BookingCheckoutActionResult =
  | ActionOk<{ checkoutUrl: string; holdExpiresAt: string }>
  | ActionErr<
      | 'unauthorized'
      | 'validation'
      | 'booking_not_found'
      | 'already_booked'
      | 'not_open'
      | 'no_capacity'
      | 'rate_limited'
      | 'stripe_unconfigured'
      | 'stripe_failed'
      | 'db_failed'
      | 'db_unavailable'
    >

export async function createBookingCheckoutAction(
  raw: BookingCheckoutInput,
  locale: string | undefined,
): Promise<BookingCheckoutActionResult> {
  const session = await getServerSession()
  if (!session) return { ok: false, error: 'unauthorized' }

  // Rate-limit per authenticated user before any heavy work (DB lookups,
  // Stripe API calls). 10/minute is generous for normal use — even a
  // user clicking Reserve, opening Stripe, then closing the tab and
  // retrying every few seconds stays well under. Fails open when Upstash
  // isn't configured. Uses the default 10/60s shape — no config needed.
  const rl = await tryRateLimit(`booking-checkout:${session.user.id}`)
  if (!rl.ok) return { ok: false, error: 'rate_limited' }

  const parsed = bookingCheckoutSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const stripe = getStripe()
  if (!stripe) {
    // Loud server-side log so the dev terminal explains the toast the user
    // sees. The most common cause is forgetting to restart `npm run dev`
    // after editing .env.local — Next.js doesn't hot-reload server env.
    console.warn(
      '[booking.checkout] STRIPE_SECRET_KEY not set in process.env. ' +
        'Set it in .env.local and RESTART the dev server (Next.js does ' +
        'not hot-reload server-side env vars). Then run `stripe listen ' +
        '--forward-to localhost:3000/api/stripe/webhook` in another ' +
        'terminal so the webhook can flip booking_orders to PAID.',
    )
    return { ok: false, error: 'stripe_unconfigured' }
  }

  const booking = await getBookingById(parsed.data.bookingId)
  if (!booking || !booking.isActive) {
    return { ok: false, error: 'booking_not_found' }
  }

  // Defensive already-booked guard. The /booking page's UI hides the Reserve
  // button for bookings the user already paid for, but a determined user
  // hitting the action directly (via cached client state, devtools, or a
  // reused old browser tab) shouldn't be able to bypass that. Blocked:
  // PAID + FULFILLED. Allowed: PENDING (mid-checkout — hold machinery
  // handles re-clicks), REFUNDED + FAILED (re-book is expected). Bounded
  // cost: at most a few rows per user.
  const paidIds = await getPaidBookingIdsForUser(session.user.id)
  if (paidIds.includes(parsed.data.bookingId)) {
    return { ok: false, error: 'already_booked' }
  }

  // Step 1: race-free hold creation. Inside a transaction with FOR UPDATE
  // on the booking row + active-holds count check.
  const holdResult = await createBookingHold({
    userId: session.user.id,
    bookingId: parsed.data.bookingId,
  })
  if (!holdResult.ok) {
    // Distinct codes so the client toast tells us which path failed —
    // useful for debugging "I configured Stripe but checkout still doesn't
    // work" reports. db_unavailable surfaces as a discrete error rather
    // than being collapsed into stripe_unconfigured.
    if (holdResult.error === 'db_unavailable') {
      return { ok: false, error: 'db_unavailable' }
    }
    if (holdResult.error === 'invalid_input') {
      return { ok: false, error: 'validation' }
    }
    return { ok: false, error: holdResult.error }
  }

  // Step 2: Stripe Checkout Session. If anything throws, roll back the hold
  // by deleting it before returning the error so capacity isn't held by a
  // dead intent.
  const origin = await resolveOrigin()
  const normalisedLocale = normaliseEmailLocale(locale)
  const customerEmail = session.user.email

  try {
    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customerEmail,
      // Hold expires in 15min; Stripe session expires in ~31min so an
      // in-flight payment doesn't get rugged. Capacity is gated by the
      // hold, not the Stripe session lifetime.
      // The 31-min ceiling (vs. Stripe's 30-min minimum) is a safety margin:
      // by the time the request reaches Stripe, `now+30*60` could be less
      // than 30 min from Stripe's clock (network + skew), causing rejection.
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      line_items: [
        {
          price_data: {
            currency: (booking.currency || 'usd').toLowerCase(),
            product_data: {
              name: booking.titleEn || booking.titleAr,
              description:
                booking.descriptionEn ?? booking.descriptionAr ?? undefined,
            },
            unit_amount: booking.priceUsd,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking`,
      metadata: {
        productType: 'BOOKING',
        bookingId: booking.id,
        bookingSlug: booking.slug,
        userId: session.user.id,
        holdId: holdResult.holdId,
        locale: normalisedLocale,
      },
    })

    if (!stripeSession.url || !stripeSession.id) {
      await deleteHoldById(holdResult.holdId)
      return { ok: false, error: 'stripe_failed' }
    }

    // Step 3: patch the hold with the Stripe session id so the webhook can
    // look it up later. Best-effort — even if this fails, the webhook can
    // still increment via the booking_orders match.
    await setHoldStripeSessionId(holdResult.holdId, stripeSession.id)

    // Step 4: persist the booking_orders record as PENDING. Idempotent on
    // stripeSessionId (unique index in schema).
    const order = await createBookingOrder({
      userId: session.user.id,
      bookingId: booking.id,
      stripeSessionId: stripeSession.id,
      amountPaid: booking.priceUsd,
      currency: booking.currency || 'USD',
    })
    if (!order) {
      // Couldn't persist the order. Roll back the hold.
      await deleteHoldById(holdResult.holdId)
      return { ok: false, error: 'db_failed' }
    }

    // Revalidate the booking page so the next visitor sees the updated
    // active-holds count immediately.
    revalidatePath('/booking')
    revalidatePath('/en/booking')

    return {
      ok: true,
      checkoutUrl: stripeSession.url,
      holdExpiresAt: holdResult.expiresAt.toISOString(),
    }
  } catch (err) {
    console.error('[booking.checkout] stripe error', err)
    // Roll back the hold so capacity isn't held by a dead intent.
    await deleteHoldById(holdResult.holdId)
    return { ok: false, error: 'stripe_failed' }
  }
}
