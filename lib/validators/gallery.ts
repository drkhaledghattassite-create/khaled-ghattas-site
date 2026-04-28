import { z } from 'zod'
import { CONTENT_STATUSES } from './article'

export const gallerySchema = z.object({
  titleAr: z.string().max(200).nullable().optional(),
  titleEn: z.string().max(200).nullable().optional(),
  image: z.string().min(1),
  category: z.string().max(60).nullable().optional(),
  status: z.enum(CONTENT_STATUSES),
  orderIndex: z.number().int().nonnegative(),
})

export type GalleryInput = z.infer<typeof gallerySchema>
