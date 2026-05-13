import { z } from 'zod'

export const newsletterSchema = z.object({
  // Normalize to lowercase so re-subscribes with different casing resolve
  // to the same row (the DB uniqueIndex on `email` is case-sensitive).
  email: z.string().email().max(254).transform((s) => s.trim().toLowerCase()),
  name: z.string().min(1).max(120).optional(),
  locale: z.enum(['ar', 'en']).optional(),
  source: z.string().max(60).optional(),
})

export type NewsletterInput = z.infer<typeof newsletterSchema>
