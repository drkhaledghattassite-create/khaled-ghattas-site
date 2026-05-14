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
import { isHttpUrl } from '@/lib/utils'

type Ok<T> = { ok: true } & T
type Err<E extends string> = { ok: false; error: E }

async function requireAdminSession(): Promise<
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'forbidden' }
> {
  const session = await getServerSession()
  if (!session) return { ok: false, error: 'unauthorized' }
  // ADMIN (developer) + CLIENT (site owner) — both trusted operators.
  // See lib/auth/admin-guard.ts for the project-wide role policy.
  if (session.user.role !== 'ADMIN' && session.user.role !== 'CLIENT') {
    return { ok: false, error: 'forbidden' }
  }
  return { ok: true }
}

function revalidateQuestionPaths() {
  // Admin queue + the asker's dashboard view. Both locales — Next App Router
  // doesn't auto-derive both from a single locale path, so we pin each.
  revalidatePath('/admin/questions')
  revalidatePath('/dashboard/ask')
  revalidatePath('/en/dashboard/ask')
}

/* ── updateQuestionStatusAction ────────────────────────────────────────── */

/**
 * `emailOutcome` describes what happened to the notification email path,
 * so the client can pick the right toast without re-deriving from the
 * input it sent. Discriminator values:
 *   - `not_applicable`: transition wasn't PENDING→ANSWERED, no email was
 *      ever in scope (ARCHIVED, revert-to-PENDING, edit-on-already-
 *      ANSWERED).
 *   - `no_body`:      defensive — answerBody was empty despite the
 *                     validator's required-when-ANSWERED rule. Status
 *                     update succeeded but no email was sent.
 *   - `no_recipient`: defensive — asker row missing despite cascade FK.
 *                     Status update succeeded; admin must notify
 *                     manually if relevant.
 *   - `sent`:         Resend accepted the message.
 *   - `send_failed`:  Resend rejected, was unconfigured, or in dev
 *                     preview-only mode. Admin should follow up
 *                     out-of-band.
 */
export type EmailOutcome =
  | 'not_applicable'
  | 'no_body'
  | 'no_recipient'
  | 'sent'
  | 'send_failed'

export type UpdateQuestionStatusActionResult =
  | Ok<{ id: string; emailOutcome: EmailOutcome }>
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

  // Normalise the answer fields. ANSWERED keeps them; PENDING / ARCHIVED
  // clear them (the query helper enforces this anyway, but doing it here
  // too makes the behaviour explicit and avoids stale values lingering in
  // the patch payload).
  const trimmedBody = (parsed.data.answerBody ?? '').trim()
  const trimmedRef = (parsed.data.answerReference ?? '').trim()
  const isAnswered = parsed.data.status === 'ANSWERED'
  const answerBodyForWrite = isAnswered && trimmedBody.length > 0 ? trimmedBody : null
  const answerReferenceForWrite =
    isAnswered && trimmedRef.length > 0 ? trimmedRef : null

  const updated = await updateQuestionStatus({
    id: parsed.data.id,
    status: parsed.data.status,
    answerBody: answerBodyForWrite,
    answerReference: answerReferenceForWrite,
  })
  if (!updated) return { ok: false, error: 'database_error' }

  revalidateQuestionPaths()

  // Email path — fire when the transition is "PENDING → ANSWERED with a
  // prose body". The supplementary URL (when present) becomes a CTA inside
  // the email; when absent, the email is prose-only. Reverting ANSWERED to
  // PENDING and re-answering also fires an email — documented behaviour.
  const transitionedFromPending = existing.status === 'PENDING'
  let emailOutcome: EmailOutcome = 'not_applicable'

  if (isAnswered && transitionedFromPending) {
    if (!answerBodyForWrite) {
      // Schema requires answerBody when ANSWERED; this branch is defensive
      // for malformed inputs that somehow slip past the validator.
      emailOutcome = 'no_body'
    } else if (!existing.user) {
      // Defensive: asker row missing despite ON DELETE CASCADE. Status
      // update has already succeeded; we can't email an absent user.
      console.warn('[updateQuestionStatusAction] orphan-user; email skipped', {
        questionId: existing.id,
      })
      emailOutcome = 'no_recipient'
    } else if (!existing.user.email) {
      // Schema-illegal — `users.email` is non-null — but the LEFT JOIN
      // could in principle return an empty string if a future migration
      // softens the column. Treat as no_recipient.
      console.warn('[updateQuestionStatusAction] empty asker email; email skipped', {
        questionId: existing.id,
      })
      emailOutcome = 'no_recipient'
    } else {
      // Only attach the URL if it's a valid http(s) link — defends against
      // a free-text note being passed by an older client that didn't split
      // the fields.
      const urlForEmail =
        answerReferenceForWrite && isHttpUrl(answerReferenceForWrite)
          ? answerReferenceForWrite
          : null
      try {
        const result = await sendAnsweredNotificationEmail({
          user: {
            email: existing.user.email,
            name: existing.user.name,
          },
          question: { subject: existing.subject },
          answerBody: answerBodyForWrite,
          answerUrl: urlForEmail,
          questionId: existing.id,
        })
        if (result.ok) {
          emailOutcome = 'sent'
        } else {
          // Structured log only — no question body / recipient address /
          // email html in logs. id + reason are enough for ops triage.
          console.warn('[updateQuestionStatusAction] email send skipped/failed', {
            questionId: existing.id,
            reason: result.reason,
          })
          emailOutcome = 'send_failed'
        }
      } catch (err) {
        // sendAnsweredNotificationEmail is documented as never-throws, but
        // belt-and-suspenders: if anything escapes, the status update has
        // already succeeded. Log and move on.
        console.error(
          '[updateQuestionStatusAction] email send threw unexpectedly',
          err,
        )
        emailOutcome = 'send_failed'
      }
    }
  }

  return { ok: true, id: updated.id, emailOutcome }
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
