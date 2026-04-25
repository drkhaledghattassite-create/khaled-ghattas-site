import { z } from 'zod'

export const bookSchema = z.object({
  slug: z.string().min(1),
  titleAr: z.string().min(1),
  titleEn: z.string().min(1),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  coverImage: z.string().url().optional(),
  price: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  digitalFile: z.string().optional(),
  externalUrl: z.string().url().optional(),
  featured: z.boolean().default(false),
  orderIndex: z.number().int().default(0),
})

export type BookInput = z.infer<typeof bookSchema>
