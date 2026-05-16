import { z } from 'zod'
import { CONTENT_STATUSES } from './article'
import { urlOrStorageKey } from './storage'

export const bookSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'kebab-case-only' }),
  titleAr: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  subtitleAr: z.string().max(200).nullable().optional(),
  subtitleEn: z.string().max(200).nullable().optional(),
  descriptionAr: z.string().min(1),
  descriptionEn: z.string().min(1),
  coverImage: z.string().min(1),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().length(3),
  // Phase F1+ — digitalFile can be an external URL (legacy paste) or an
  // R2 storage key (after admin upload). The shared `urlOrStorageKey`
  // helper accepts both. externalUrl stays URL-only — it's a link to a
  // third-party store, never an R2 object.
  digitalFile: urlOrStorageKey.or(z.literal('')).nullable().optional(),
  externalUrl: z.string().url().or(z.literal('')).nullable().optional(),
  publisher: z.string().max(200).nullable().optional(),
  publicationYear: z.number().int().min(1900).max(2100).nullable().optional(),
  status: z.enum(CONTENT_STATUSES),
  featured: z.boolean(),
  orderIndex: z.number().int().nonnegative(),
})

export type BookInput = z.infer<typeof bookSchema>

export const interviewSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'kebab-case-only' }),
  titleAr: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  descriptionAr: z.string().nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  thumbnailImage: z.string().min(1),
  videoUrl: z.string().url().or(z.literal('')),
  source: z.string().max(120).nullable().optional(),
  sourceAr: z.string().max(120).nullable().optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  status: z.enum(CONTENT_STATUSES),
  featured: z.boolean(),
  orderIndex: z.number().int().nonnegative(),
})

export type InterviewInput = z.infer<typeof interviewSchema>

export const eventSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'kebab-case-only' }),
  titleAr: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  descriptionAr: z.string().min(1),
  descriptionEn: z.string().min(1),
  locationAr: z.string().max(200).nullable().optional(),
  locationEn: z.string().max(200).nullable().optional(),
  coverImage: z.string().nullable().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  registrationUrl: z.string().url().or(z.literal('')).nullable().optional(),
  status: z.enum(['UPCOMING', 'PAST', 'CANCELLED'] as const),
  orderIndex: z.number().int().nonnegative(),
})

export type EventInput = z.infer<typeof eventSchema>
