import { z } from 'zod'

export const articleSchema = z.object({
  slug: z.string().min(1),
  titleAr: z.string().min(1),
  titleEn: z.string().min(1),
  contentAr: z.string().min(1),
  contentEn: z.string().min(1),
  excerptAr: z.string().optional(),
  excerptEn: z.string().optional(),
  coverImage: z.string().url().optional(),
  category: z.string().optional(),
  featured: z.boolean().default(false),
})

export type ArticleInput = z.infer<typeof articleSchema>
