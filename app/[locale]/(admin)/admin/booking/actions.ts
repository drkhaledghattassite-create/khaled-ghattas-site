'use server'

/**
 * Server actions for the admin booking domain (Phase A2).
 *
 * Five surfaces share this file:
 *   - Tours: create / update / delete / toggle-active
 *   - Bookings: create / update (with capacity guard) / state-toggle /
 *     capacity-quick-edit / delete
 *   - Tour suggestions: mark reviewed
 *   - Booking interest: mark contacted (+ bulk)
 *   - Booking orders: trigger Stripe refund / purge stale PENDING
 *
 * Auth model — same as the session-content actions: action functions can't
 * receive a Request, so we inline the role check via getServerSession +
 * UserRole. Next.js encrypted action ids cover the CSRF surface.
 *
 * Return shape: every action returns a discriminated union so the client
 * can map error codes to translated toasts without parsing exceptions.
 */

import Stripe from 'stripe'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth/server'
import { getStripe } from '@/lib/stripe'
import {
  bulkMarkInterestContacted,
  createBookingAdmin,
  createTour,
  deleteBookingAdmin,
  deleteTour,
  getBookingOrderById,
  markInterestContacted,
  markSuggestionReviewed,
  purgeStaleBookingOrders,
  toggleTourActive,
  updateBookingAdmin,
  updateBookingState,
  updateTour,
  type CreateBookingAdminInput,
  type CreateTourAdminInput,
} from '@/lib/db/queries'
import {
  bookingAdminSchema,
  bookingCapacityAdminSchema,
  bookingStateAdminSchema,
  tourAdminSchema,
  type BookingAdminInput,
  type BookingCapacityAdminInput,
  type BookingStateAdminInput,
  type TourAdminInput,
} from '@/lib/validators/booking'

type Ok<T> = { ok: true } & T
type Err<E extends string, D = undefined> = D extends undefined
  ? { ok: false; error: E }
  : { ok: false; error: E; data: D }

async function requireAdminSession(): Promise<
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'forbidden' }
> {
  const session = await getServerSession()
  if (!session) return { ok: false, error: 'unauthorized' }
  if (session.user.role !== 'ADMIN') return { ok: false, error: 'forbidden' }
  return { ok: true }
}

// Server actions don't auto-revalidate App-Router pages. Pin the affected
// admin routes — and the public booking page where appropriate — so a
// subsequent navigation reflects the mutation without a hard refresh.
function revalidateBookingAdmin() {
  revalidatePath('/admin/booking/tours')
  revalidatePath('/admin/booking/bookings')
  revalidatePath('/admin/booking/tour-suggestions')
  revalidatePath('/admin/booking/interest')
  revalidatePath('/admin/booking/orders')
  // Public booking surface — capacity / state changes affect what the
  // public page renders.
  revalidatePath('/booking')
  revalidatePath('/en/booking')
}

/* ──────────────────────────────────────────────────────────────────────
 * Coercers — turn admin form values (strings from datetime inputs,
 * empty strings instead of nulls) into the shape the query helpers want.
 * Keep these next to the validators so the surface area is one file.
 * ──────────────────────────────────────────────────────────────────── */

function coerceDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function coerceNullableString(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function coerceTour(input: TourAdminInput): CreateTourAdminInput | null {
  const date = coerceDate(input.date)
  if (!date) return null
  return {
    slug: input.slug,
    titleAr: input.titleAr,
    titleEn: input.titleEn,
    cityAr: input.cityAr,
    cityEn: input.cityEn,
    countryAr: input.countryAr,
    countryEn: input.countryEn,
    regionAr: coerceNullableString(input.regionAr),
    regionEn: coerceNullableString(input.regionEn),
    date,
    venueAr: coerceNullableString(input.venueAr),
    venueEn: coerceNullableString(input.venueEn),
    descriptionAr: coerceNullableString(input.descriptionAr),
    descriptionEn: coerceNullableString(input.descriptionEn),
    externalBookingUrl: coerceNullableString(input.externalBookingUrl),
    coverImage: coerceNullableString(input.coverImage),
    attendedCount: input.attendedCount ?? null,
    isActive: input.isActive,
    displayOrder: input.displayOrder,
  }
}

function coerceBooking(input: BookingAdminInput): CreateBookingAdminInput {
  return {
    slug: input.slug,
    productType: input.productType,
    titleAr: input.titleAr,
    titleEn: input.titleEn,
    descriptionAr: input.descriptionAr,
    descriptionEn: input.descriptionEn,
    coverImage: coerceNullableString(input.coverImage),
    priceUsd: input.priceUsd,
    currency: input.currency,
    nextCohortDate: coerceDate(input.nextCohortDate),
    cohortLabelAr: coerceNullableString(input.cohortLabelAr),
    cohortLabelEn: coerceNullableString(input.cohortLabelEn),
    durationMinutes: input.durationMinutes ?? null,
    formatAr: coerceNullableString(input.formatAr),
    formatEn: coerceNullableString(input.formatEn),
    maxCapacity: input.maxCapacity,
    bookingState: input.bookingState,
    displayOrder: input.displayOrder,
    isActive: input.isActive,
  }
}

/* ──────────────────────────────────────────────────────────────────────
 * Tour actions
 * ──────────────────────────────────────────────────────────────────── */

export type TourActionResult =
  | Ok<{ id: string }>
  | Err<'unauthorized' | 'forbidden' | 'validation' | 'db_failed'>

export async function createTourAction(
  raw: TourAdminInput,
): Promise<TourActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = tourAdminSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const coerced = coerceTour(parsed.data)
  if (!coerced) return { ok: false, error: 'validation' }

  const row = await createTour(coerced)
  if (!row) return { ok: false, error: 'db_failed' }

  revalidateBookingAdmin()
  return { ok: true, id: row.id }
}

export async function updateTourAction(
  id: string,
  raw: TourAdminInput,
): Promise<TourActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = tourAdminSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const coerced = coerceTour(parsed.data)
  if (!coerced) return { ok: false, error: 'validation' }

  const row = await updateTour(id, coerced)
  if (!row) return { ok: false, error: 'db_failed' }

  revalidateBookingAdmin()
  return { ok: true, id: row.id }
}

export async function deleteTourAction(
  id: string,
): Promise<Ok<{ deleted: true }> | Err<'unauthorized' | 'forbidden' | 'db_failed'>> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const ok = await deleteTour(id)
  if (!ok) return { ok: false, error: 'db_failed' }

  revalidateBookingAdmin()
  return { ok: true, deleted: true }
}

export async function toggleTourActiveAction(
  id: string,
  isActive: boolean,
): Promise<Ok<{ id: string }> | Err<'unauthorized' | 'forbidden' | 'db_failed'>> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const row = await toggleTourActive(id, isActive)
  if (!row) return { ok: false, error: 'db_failed' }

  revalidateBookingAdmin()
  return { ok: true, id: row.id }
}

/* ──────────────────────────────────────────────────────────────────────
 * Booking actions
 * ──────────────────────────────────────────────────────────────────── */

export type BookingActionResult =
  | Ok<{ id: string }>
  | Err<'unauthorized' | 'forbidden' | 'validation' | 'db_failed'>
  | {
      ok: false
      error: 'capacity_below_commitment'
      data: { currentBookings: number; currentHolds: number }
    }

export async function createBookingAction(
  raw: BookingAdminInput,
): Promise<BookingActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = bookingAdminSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const coerced = coerceBooking(parsed.data)
  const row = await createBookingAdmin(coerced)
  if (!row) return { ok: false, error: 'db_failed' }

  revalidateBookingAdmin()
  return { ok: true, id: row.id }
}

export async function updateBookingAction(
  id: string,
  raw: BookingAdminInput,
): Promise<BookingActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = bookingAdminSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const coerced = coerceBooking(parsed.data)
  const result = await updateBookingAdmin(id, coerced)
  if (!result.ok) {
    if (result.error === 'capacity_below_commitment') {
      return {
        ok: false,
        error: 'capacity_below_commitment',
        data: result.data ?? { currentBookings: 0, currentHolds: 0 },
      }
    }
    if (result.error === 'not_found') return { ok: false, error: 'db_failed' }
    if (result.error === 'invalid_input') return { ok: false, error: 'validation' }
    return { ok: false, error: 'db_failed' }
  }

  revalidateBookingAdmin()
  return { ok: true, id: result.booking.id }
}

export async function deleteBookingAction(
  id: string,
): Promise<
  | Ok<{ deleted: true }>
  | Err<'unauthorized' | 'forbidden' | 'has_orders' | 'db_failed'>
> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const result = await deleteBookingAdmin(id)
  if (!result.ok) {
    if (result.error === 'has_orders') return { ok: false, error: 'has_orders' }
    return { ok: false, error: 'db_failed' }
  }

  revalidateBookingAdmin()
  return { ok: true, deleted: true }
}

export async function updateBookingStateAction(
  raw: BookingStateAdminInput,
): Promise<Ok<{ id: string }> | Err<'unauthorized' | 'forbidden' | 'validation' | 'db_failed'>> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = bookingStateAdminSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const row = await updateBookingState(parsed.data.bookingId, parsed.data.bookingState)
  if (!row) return { ok: false, error: 'db_failed' }

  revalidateBookingAdmin()
  return { ok: true, id: row.id }
}

export async function updateBookingCapacityAction(
  raw: BookingCapacityAdminInput,
): Promise<BookingActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = bookingCapacityAdminSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const result = await updateBookingAdmin(parsed.data.bookingId, {
    maxCapacity: parsed.data.maxCapacity,
  })
  if (!result.ok) {
    if (result.error === 'capacity_below_commitment') {
      return {
        ok: false,
        error: 'capacity_below_commitment',
        data: result.data ?? { currentBookings: 0, currentHolds: 0 },
      }
    }
    if (result.error === 'not_found') return { ok: false, error: 'db_failed' }
    if (result.error === 'invalid_input') return { ok: false, error: 'validation' }
    return { ok: false, error: 'db_failed' }
  }

  revalidateBookingAdmin()
  return { ok: true, id: result.booking.id }
}

/* ──────────────────────────────────────────────────────────────────────
 * Tour suggestion actions
 * ──────────────────────────────────────────────────────────────────── */

const reviewedSchema = z.object({
  suggestionId: z.string().uuid(),
  reviewed: z.boolean(),
})

export async function markSuggestionReviewedAction(
  raw: z.infer<typeof reviewedSchema>,
): Promise<Ok<{ id: string }> | Err<'unauthorized' | 'forbidden' | 'validation' | 'db_failed'>> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = reviewedSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const row = await markSuggestionReviewed(parsed.data.suggestionId, parsed.data.reviewed)
  if (!row) return { ok: false, error: 'db_failed' }

  revalidatePath('/admin/booking/tour-suggestions')
  return { ok: true, id: row.id }
}

/* ──────────────────────────────────────────────────────────────────────
 * Booking interest actions
 * ──────────────────────────────────────────────────────────────────── */

const interestSchema = z.object({
  interestId: z.string().uuid(),
  contacted: z.boolean(),
})

export async function markInterestContactedAction(
  raw: z.infer<typeof interestSchema>,
): Promise<Ok<{ id: string }> | Err<'unauthorized' | 'forbidden' | 'validation' | 'db_failed'>> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = interestSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const row = await markInterestContacted(parsed.data.interestId, parsed.data.contacted)
  if (!row) return { ok: false, error: 'db_failed' }

  revalidatePath('/admin/booking/interest')
  return { ok: true, id: row.id }
}

const bulkInterestSchema = z.object({
  interestIds: z.array(z.string().uuid()).min(1).max(500),
  contacted: z.boolean(),
})

export async function bulkMarkInterestContactedAction(
  raw: z.infer<typeof bulkInterestSchema>,
): Promise<Ok<{ count: number }> | Err<'unauthorized' | 'forbidden' | 'validation' | 'db_failed'>> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = bulkInterestSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const count = await bulkMarkInterestContacted(parsed.data.interestIds, parsed.data.contacted)
  revalidatePath('/admin/booking/interest')
  return { ok: true, count }
}

/* ──────────────────────────────────────────────────────────────────────
 * Booking orders — Stripe refund + stale-PENDING purge
 * ──────────────────────────────────────────────────────────────────── */

const refundSchema = z.object({
  orderId: z.string().uuid(),
})

export type RefundActionResult =
  | Ok<{ orderId: string }>
  | Err<
      | 'unauthorized'
      | 'forbidden'
      | 'validation'
      | 'invalid_refund_target'
      | 'stripe_unconfigured'
      | 'order_not_found'
    >
  | { ok: false; error: 'stripe_refund_failed'; data: { stripeMessage: string } }

export async function triggerBookingRefundAction(
  raw: z.infer<typeof refundSchema>,
): Promise<RefundActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = refundSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const order = await getBookingOrderById(parsed.data.orderId)
  if (!order) return { ok: false, error: 'order_not_found' }

  // Validate the order is in a refundable state. PAID + paymentIntent set is
  // the only valid transition; PENDING means payment never completed,
  // FAILED means it's already terminal, REFUNDED means double-refund.
  if (order.status !== 'PAID' || !order.stripePaymentIntentId) {
    return { ok: false, error: 'invalid_refund_target' }
  }

  const stripe = getStripe()
  if (!stripe) return { ok: false, error: 'stripe_unconfigured' }

  // Per the Phase A1 / books-orders precedent: Stripe call BEFORE local
  // mutation. The webhook will fire `charge.refunded` and update the local
  // booking_orders row + decrement bookedCount via the existing handler.
  // We just need to start the refund here — local state catches up async.
  try {
    await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
    })
  } catch (err) {
    // "already refunded" is a soft-success — the webhook will sync our
    // local row when the matching charge.refunded event fires (or already
    // fired). Returning success keeps the operator UX clean.
    if (
      err instanceof Stripe.errors.StripeInvalidRequestError &&
      err.code === 'charge_already_refunded'
    ) {
      console.info(
        '[booking.refund] Stripe says already refunded — local state will sync via webhook',
        { orderId: order.id, paymentIntentId: order.stripePaymentIntentId },
      )
      revalidatePath('/admin/booking/orders')
      return { ok: true, orderId: order.id }
    }
    console.error('[booking.refund] stripe refund failed', err)
    const message =
      err instanceof Stripe.errors.StripeError
        ? err.message
        : err instanceof Error
        ? err.message
        : 'Unknown Stripe error.'
    return {
      ok: false,
      error: 'stripe_refund_failed',
      data: { stripeMessage: message },
    }
  }

  revalidatePath('/admin/booking/orders')
  revalidatePath('/booking')
  revalidatePath('/en/booking')
  return { ok: true, orderId: order.id }
}

export async function purgeStaleBookingOrdersAction(): Promise<
  Ok<{ count: number }> | Err<'unauthorized' | 'forbidden' | 'db_failed'>
> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const count = await purgeStaleBookingOrders()
  revalidatePath('/admin/booking/orders')
  return { ok: true, count }
}
