/**
 * Phase D2 — synchronous Resend send used by the cron worker (when
 * draining the queue) and by the EMAIL_FORCE_SYNC dev escape hatch.
 *
 * This is the ONLY place that talks to Resend directly. Every other
 * surface goes through `lib/email/send.ts` → enqueue → cron → here.
 *
 * Returns a discriminated result instead of throwing so the caller can
 * decide between markEmailSent (ok) and markEmailRetry (error).
 */

import { getResend } from './index'

export type SendViaResendInput = {
  from: string
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string | null
}

export type SendViaResendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string; transient: boolean }

/**
 * Heuristic: treat invalid-recipient + signature errors as PERMANENT
 * (transient=false) so admin can dead-letter them. Network / rate-limit /
 * 5xx errors are TRANSIENT (transient=true) and will retry per the
 * backoff schedule.
 *
 * Resend's REST client returns `{ error: { name, message } }`; the name
 * field is the discriminator. We map a few known buckets and default to
 * transient because the worst case is one extra retry — preferable to
 * silently dropping a recoverable error.
 */
const PERMANENT_ERROR_NAMES = new Set<string>([
  'validation_error',
  'invalid_from_address',
  'invalid_to_address',
  'missing_required_field',
])

function isPermanentResendError(name: string | undefined): boolean {
  if (!name) return false
  return PERMANENT_ERROR_NAMES.has(name)
}

export async function sendViaResend(
  input: SendViaResendInput,
): Promise<SendViaResendResult> {
  const resend = getResend()
  if (!resend) {
    return { ok: false, error: 'no-api-key', transient: false }
  }
  try {
    const { data, error } = await resend.emails.send({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    })
    if (error) {
      const name = (error as { name?: string }).name
      const message = error.message ?? 'unknown_resend_error'
      return {
        ok: false,
        error: `${name ?? 'resend_error'}: ${message}`,
        transient: !isPermanentResendError(name),
      }
    }
    return { ok: true, id: data?.id ?? null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Network-level exceptions (fetch failure, timeout, DNS) are always
    // transient — they're cron infrastructure issues, not message-level.
    return { ok: false, error: message, transient: true }
  }
}
