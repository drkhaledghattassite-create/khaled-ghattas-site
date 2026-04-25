import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  subject: z.string().min(1).max(160),
  message: z.string().min(1).max(5000),
})

export type ContactInput = z.infer<typeof contactSchema>
