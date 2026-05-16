import { z } from 'zod'
import { urlOrStorageKey } from './storage'

export const ARTICLE_CATEGORIES = [
  'PHILOSOPHY',
  'PSYCHOLOGY',
  'SOCIETY',
  'POLITICS',
  'CULTURE',
  'OTHER',
] as const

export const CONTENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const

export const articleSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'kebab-case-only' }),
  titleAr: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  excerptAr: z.string().min(1).max(280),
  excerptEn: z.string().min(1).max(280),
  contentAr: z.string().min(1),
  contentEn: z.string().min(1),
  // Phase F1+ — accepts external URLs (legacy paste) or R2 article-cover keys.
  coverImage: urlOrStorageKey.or(z.literal('')).nullable().optional(),
  category: z.enum(ARTICLE_CATEGORIES),
  status: z.enum(CONTENT_STATUSES),
  featured: z.boolean(),
  orderIndex: z.number().int().nonnegative(),
})

export type ArticleInput = z.infer<typeof articleSchema>
