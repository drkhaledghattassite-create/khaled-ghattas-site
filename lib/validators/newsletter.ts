import { z } from 'zod'

export const newsletterSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(120).optional(),
  locale: z.enum(['ar', 'en']).optional(),
  source: z.string().max(60).optional(),
})

export type NewsletterInput = z.infer<typeof newsletterSchema>
