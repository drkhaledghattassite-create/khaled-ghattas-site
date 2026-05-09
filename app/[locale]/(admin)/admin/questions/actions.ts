'use server'

/**
 * Phase B2 — admin server actions for the "Ask Dr. Khaled" queue.
 *
 * Auth model: server actions can't receive a Request object, so we inline
 * the role check via getServerSession + UserRole — the same pattern the
 * booking + session-content admin actions already use. Next.js encrypted
 * action ids cover the CSRF surface.
 *
 * Two actions:
 *   - updateQuestionStatusAction — PENDING ↔ ANSWERED ↔ ARCHIVED
 *   - deleteQuestionAction       — hard delete (spam/abuse only)
 *
 * On a PENDING → ANSWERED transition with a URL answer reference, we
 * best-effort send a notification email to the asker. The send NEVER blocks
 * or fails the status update — admins must be able to mark answered even
 * when Resend is unconfigured or unreachable.
 */

import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/lib/auth/server'
import {
  deleteQuestion,
  getQuestionById,
  updateQuestionStatus,
} from '@/lib/db/queries'
import { sendAnsweredNotificationEmail } from '@/lib/email/send'
import {
  deleteQuestionSchema,
  updateQuestionStatusSchema,
  type DeleteQuestionInput,
  type UpdateQuestionStatusInput,
} from '@/lib/validators/user-question'

type Ok<T> = { ok: true } & T
type Err<E extends string> = { ok: false; error: E }

async function requireAdminSession(): Promise<
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'forbidden' }
> {
  const session = await getServerSession()
  if (!session) return { ok: false, error: 'unauthorized' }
  if (session.user.role !== 'ADMIN') return { ok: false, error: 'forbidden' }
  return { ok: true }
}

function revalidateQuestionPaths() {
  // Admin queue + the asker's dashboard view. Both locales — Next App Router
  // doesn't auto-derive both from a single locale path, so we pin each.
  revalidatePath('/admin/questions')
  revalidatePath('/dashboard/ask')
  revalidatePath('/en/dashboard/ask')
}

/**
 * Detect whether the answer reference is a public URL — used to decide
 * whether to send a notification email. Free-text notes don't have a link
 * to deliver, so the email is skipped. Mirror's `QuestionCard.isHttpUrl`.
 */
function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/* ── updateQuestionStatusAction ────────────────────────────────────────── */

export type UpdateQuestionStatusActionResult =
  | Ok<{ id: string; emailQueued: boolean }>
  | Err<
      | 'unauthorized'
      | 'forbidden'
      | 'validation'
      | 'not_found'
      | 'database_error'
    >

export async function updateQuestionStatusAction(
  raw: UpdateQuestionStatusInput,
): Promise<UpdateQuestionStatusActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = updateQuestionStatusSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  // Look up the row before mutating so we have the recipient email + name
  // for a potential notification email AND so we can short-circuit on
  // missing rows with a clean `not_found`.
  const existing = await getQuestionById(parsed.data.id)
  if (!existing) return { ok: false, error: 'not_found' }

  // Trim and normalise the answer reference. ANSWERED keeps it; PENDING /
  // ARCHIVED clear it (the query helper enforces this anyway, but doing it
  // here too makes the behaviour explicit and avoids a stale value sitting
  // in the patch payload).
  const trimmedRef = (parsed.data.answerReference ?? '').trim()
  const answerReferenceForWrite =
    parsed.data.status === 'ANSWERED' && trimmedRef.length > 0
      ? trimmedRef
      : null

  const updated = await updateQuestionStatus({
    id: parsed.data.id,
    status: parsed.data.status,
    answerReference: answerReferenceForWrite,
  })
  if (!updated) return { ok: false, error: 'database_error' }

  revalidateQuestionPaths()

  // Email path — only when the transition is "PENDING → ANSWERED with URL".
  // Reverting an ANSWERED back to PENDING and re-answering with a different
  // URL also fires an email; admins should be aware of that. Documented
  // in self-critique.
  let emailQueued = false
  const transitionedFromPending = existing.status === 'PENDING'
  const isAnsweredTransition = parsed.data.status === 'ANSWERED'
  if (
    isAnsweredTransition &&
    transitionedFromPending &&
    answerReferenceForWrite &&
    isHttpUrl(answerReferenceForWrite)
  ) {
    try {
      const result = await sendAnsweredNotificationEmail({
        user: {
          email: existing.user.email,
          name: existing.user.name,
        },
        question: { subject: existing.subject },
        answerUrl: answerReferenceForWrite,
      })
      emailQueued = result.ok
      if (!result.ok) {
        // Structured log only — no question subject / body / email body in
        // logs. The id + reason are enough for ops triage.
        console.warn('[updateQuestionStatusAction] email send skipped/failed', {
          questionId: existing.id,
          reason: result.reason,
        })
      }
    } catch (err) {
      // sendAnsweredNotificationEmail is documented as never-throws, but
      // belt-and-suspenders: if anything escapes, the status update has
      // already succeeded. Log and move on.
      console.error(
        '[updateQuestionStatusAction] email send threw unexpectedly',
        err,
      )
      emailQueued = false
    }
  }

  return { ok: true, id: updated.id, emailQueued }
}

/* ── deleteQuestionAction ──────────────────────────────────────────────── */

export type DeleteQuestionActionResult =
  | Ok<{ id: string }>
  | Err<'unauthorized' | 'forbidden' | 'validation' | 'database_error'>

export async function deleteQuestionAction(
  raw: DeleteQuestionInput,
): Promise<DeleteQuestionActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = deleteQuestionSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  try {
    await deleteQuestion(parsed.data.id)
  } catch (err) {
    console.error('[deleteQuestionAction]', err)
    return { ok: false, error: 'database_error' }
  }

  revalidateQuestionPaths()
  return { ok: true, id: parsed.data.id }
}
