import { z } from 'zod'
import { CONTENT_STATUSES } from './article'

/**
 * Validators for the corporate-programs feature.
 *
 * Three schemas:
 *   - corporateProgramSchema: admin CRUD for programs
 *   - corporateClientSchema: admin CRUD for trust-strip logos
 *   - corporateRequestSchema: public POST from the on-page request form
 *   - corporateRequestUpdateSchema: admin PATCH for status / notes
 */

const slugRule = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'kebab-case-only' })

export const corporateProgramSchema = z.object({
  slug: slugRule,
  titleAr: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  descriptionAr: z.string().min(1),
  descriptionEn: z.string().min(1),
  durationAr: z.string().max(120).nullable().optional(),
  durationEn: z.string().max(120).nullable().optional(),
  audienceAr: z.string().max(200).nullable().optional(),
  audienceEn: z.string().max(200).nullable().optional(),
  coverImage: z.string().nullable().optional(),
  status: z.enum(CONTENT_STATUSES),
  featured: z.boolean(),
  orderIndex: z.number().int().nonnegative(),
})

export type CorporateProgramInput = z.infer<typeof corporateProgramSchema>

export const corporateClientSchema = z.object({
  name: z.string().min(1).max(200),
  nameAr: z.string().max(200).nullable().optional(),
  logoUrl: z.string().min(1),
  websiteUrl: z.string().url().or(z.literal('')).nullable().optional(),
  status: z.enum(CONTENT_STATUSES),
  orderIndex: z.number().int().nonnegative(),
})

export type CorporateClientInput = z.infer<typeof corporateClientSchema>

/**
 * Public form payload. Bilingual fields aren't needed — the form is shown in
 * one locale at a time and the submitter writes in their preferred language.
 */
export const corporateRequestSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional().or(z.literal('')),
  organization: z.string().min(1).max(200),
  position: z.string().max(120).optional().or(z.literal('')),
  programId: z.string().uuid().optional().or(z.literal('')),
  preferredDate: z.string().max(40).optional().or(z.literal('')),
  attendeeCount: z.number().int().min(1).max(10000).optional().nullable(),
  message: z.string().max(4000).optional().or(z.literal('')),
})

export type CorporateRequestInput = z.infer<typeof corporateRequestSchema>

export const CORPORATE_REQUEST_STATUSES = [
  'NEW',
  'CONTACTED',
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
] as const

export const corporateRequestUpdateSchema = z.object({
  status: z.enum(CORPORATE_REQUEST_STATUSES).optional(),
  adminNotes: z.string().max(4000).nullable().optional(),
})

export type CorporateRequestUpdateInput = z.infer<
  typeof corporateRequestUpdateSchema
>
