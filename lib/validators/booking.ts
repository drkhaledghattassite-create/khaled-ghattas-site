import { z } from 'zod'

/**
 * Validators for the /booking surface (Services for Individuals).
 *
 * Public-facing schemas only — admin CRUD for tours/bookings ships in Phase A2
 * and will get its own admin*Schema exports next to these.
 *
 *   - tourSuggestionSchema: form payload for "I want a tour in my city"
 *   - bookingInterestSchema: waitlist signup for closed/sold-out bookings
 *   - bookingCheckoutSchema: pre-Stripe handoff (just the booking id —
 *     userId is server-side from the session, never trusted from the client)
 *
 * The Suggest and Interest forms pull name/email from the session, so they're
 * NOT in these schemas. The action layer is responsible for that join.
 */

export const BOOKING_PRODUCT_TYPES = [
  'RECONSIDER_COURSE',
  'ONLINE_SESSION',
] as const
export type BookingProductTypeLiteral = (typeof BOOKING_PRODUCT_TYPES)[number]

export const BOOKING_STATES = ['OPEN', 'CLOSED', 'SOLD_OUT'] as const
export type BookingStateLiteral = (typeof BOOKING_STATES)[number]

export const tourSuggestionSchema = z.object({
  suggestedCity: z.string().trim().min(1).max(120),
  suggestedCountry: z.string().trim().min(1).max(120),
  additionalNotes: z.string().trim().max(500).optional().or(z.literal('')),
})

export type TourSuggestionInput = z.infer<typeof tourSuggestionSchema>

export const bookingInterestSchema = z.object({
  bookingId: z.string().uuid(),
  additionalNotes: z.string().trim().max(500).optional().or(z.literal('')),
})

export type BookingInterestInput = z.infer<typeof bookingInterestSchema>

export const bookingCheckoutSchema = z.object({
  bookingId: z.string().uuid(),
})

export type BookingCheckoutInput = z.infer<typeof bookingCheckoutSchema>

/* ──────────────────────────────────────────────────────────────────────────
 * Phase A2 — admin schemas
 *
 * Server-side schemas for the admin booking domain. The same schema is
 * reused on the client (form's zodResolver) and on the server action.
 * ──────────────────────────────────────────────────────────────────────── */

const slugRule = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'kebab-case-only' })

// Region tuple: matches the dropdown options on the form. Free-text would be
// allowed by the schema's underlying type but we constrain at the admin
// layer to keep the public chip vocabulary tight.
export const TOUR_REGIONS = [
  'MENA',
  'GCC',
  'EUROPE',
  'NORTH_AMERICA',
  'ASIA',
  'AFRICA',
  'OTHER',
] as const

export const tourAdminSchema = z.object({
  slug: slugRule,
  titleAr: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  cityAr: z.string().trim().min(1).max(120),
  cityEn: z.string().trim().min(1).max(120),
  countryAr: z.string().trim().min(1).max(120),
  countryEn: z.string().trim().min(1).max(120),
  regionAr: z.string().trim().max(80).nullable().optional(),
  regionEn: z.string().trim().max(80).nullable().optional(),
  date: z.string().min(1), // ISO 8601 — coerced to Date in the action
  venueAr: z.string().trim().max(200).nullable().optional(),
  venueEn: z.string().trim().max(200).nullable().optional(),
  descriptionAr: z.string().trim().max(2000).nullable().optional(),
  descriptionEn: z.string().trim().max(2000).nullable().optional(),
  externalBookingUrl: z
    .string()
    .url({ message: 'invalid-url' })
    .startsWith('https://', { message: 'https-required' })
    .max(500)
    .nullable()
    .optional()
    .or(z.literal('')),
  coverImage: z.string().trim().max(500).nullable().optional().or(z.literal('')),
  attendedCount: z
    .number()
    .int()
    .min(0)
    .max(100000)
    .nullable()
    .optional(),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0).max(10000),
})

export type TourAdminInput = z.infer<typeof tourAdminSchema>

export const bookingAdminSchema = z.object({
  slug: slugRule,
  productType: z.enum(BOOKING_PRODUCT_TYPES),
  titleAr: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  descriptionAr: z.string().trim().min(1).max(2000),
  descriptionEn: z.string().trim().min(1).max(2000),
  coverImage: z.string().trim().max(500).nullable().optional().or(z.literal('')),
  // Cents. Capped at $100k just to catch typos (admins entering dollars
  // by mistake — 100 entered as $100k catches the error early).
  priceUsd: z.number().int().min(0).max(10_000_000),
  currency: z
    .string()
    .trim()
    .length(3)
    .regex(/^[A-Z]{3}$/, { message: 'iso-4217' }),
  nextCohortDate: z.string().nullable().optional().or(z.literal('')),
  cohortLabelAr: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .or(z.literal('')),
  cohortLabelEn: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .or(z.literal('')),
  durationMinutes: z
    .number()
    .int()
    .min(0)
    .max(60 * 24)
    .nullable()
    .optional(),
  formatAr: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .or(z.literal('')),
  formatEn: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .or(z.literal('')),
  maxCapacity: z.number().int().min(1).max(10000),
  bookingState: z.enum(BOOKING_STATES),
  displayOrder: z.number().int().min(0).max(10000),
  isActive: z.boolean(),
})

export type BookingAdminInput = z.infer<typeof bookingAdminSchema>

// Quick-edit schema for the inline capacity edit on the bookings list page.
// Only the field that's commonly tweaked operationally.
export const bookingCapacityAdminSchema = z.object({
  bookingId: z.string().uuid(),
  maxCapacity: z.number().int().min(1).max(10000),
})

export type BookingCapacityAdminInput = z.infer<
  typeof bookingCapacityAdminSchema
>

// Quick-edit for the inline state toggle.
export const bookingStateAdminSchema = z.object({
  bookingId: z.string().uuid(),
  bookingState: z.enum(BOOKING_STATES),
})

export type BookingStateAdminInput = z.infer<typeof bookingStateAdminSchema>
