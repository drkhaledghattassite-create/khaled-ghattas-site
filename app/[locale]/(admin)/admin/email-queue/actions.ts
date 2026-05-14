'use server'

/**
 * Phase D2 — server actions for the admin email-queue surface.
 *
 *   - retryEmailQueueAction   → POST a row back to PENDING for re-pickup
 *   - markEmailQueueFailedAction → admin dead-letters a row
 *
 * Developer-only (ADMIN role): the email queue is a system/ops surface.
 * CLIENT (the site owner) is intentionally rejected — the matching list +
 * detail pages 404 for CLIENT, and these actions return 'forbidden' if
 * somehow invoked.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth/server'
import {
  getEmailQueueEntry,
  markEmailFailed,
  retryEmailManually,
} from '@/lib/db/queries'

type ActionOk = { ok: true }
type ActionErr<E extends string> = { ok: false; error: E }

async function requireDeveloperSession() {
  const session = await getServerSession()
  if (!session) return { ok: false as const, error: 'unauthorized' as const }
  // Developer-only: email-queue ops are reserved for ADMIN (Kamal). CLIENT
  // (Dr. Khaled) shouldn't be retrying or dead-lettering transactional mail.
  if (session.user.role !== 'ADMIN') {
    return { ok: false as const, error: 'forbidden' as const }
  }
  return { ok: true as const, session }
}

const retrySchema = z.object({
  id: z.string().uuid(),
})

export type RetryEmailQueueActionResult =
  | ActionOk
  | ActionErr<'unauthorized' | 'forbidden' | 'not_found' | 'validation'>

export async function retryEmailQueueAction(
  raw: z.infer<typeof retrySchema>,
): Promise<RetryEmailQueueActionResult> {
  const guard = await requireDeveloperSession()
  if (!guard.ok) return { ok: false, error: guard.error }
  const parsed = retrySchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const existing = await getEmailQueueEntry(parsed.data.id)
  if (!existing) return { ok: false, error: 'not_found' }

  const updated = await retryEmailManually(parsed.data.id)
  if (!updated) return { ok: false, error: 'not_found' }
  revalidatePath('/admin/email-queue')
  revalidatePath(`/admin/email-queue/${parsed.data.id}`)
  return { ok: true }
}

const markFailedSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
})

export type MarkEmailQueueFailedActionResult =
  | ActionOk
  | ActionErr<'unauthorized' | 'forbidden' | 'not_found' | 'validation'>

export async function markEmailQueueFailedAction(
  raw: z.infer<typeof markFailedSchema>,
): Promise<MarkEmailQueueFailedActionResult> {
  const guard = await requireDeveloperSession()
  if (!guard.ok) return { ok: false, error: guard.error }
  const parsed = markFailedSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const existing = await getEmailQueueEntry(parsed.data.id)
  if (!existing) return { ok: false, error: 'not_found' }

  await markEmailFailed(parsed.data.id, parsed.data.reason)
  revalidatePath('/admin/email-queue')
  revalidatePath(`/admin/email-queue/${parsed.data.id}`)
  return { ok: true }
}
