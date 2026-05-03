/**
 * Single send wrapper around Resend. All transactional email goes through
 * here so we get a uniform no-op-when-not-configured story plus consistent
 * error logging. Templates live alongside this file in `./templates/`.
 */

import { getResend } from './index'

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  /** Optional plain-text fallback. Resend will auto-derive one if omitted. */
  text?: string
  /** Defaults to `EMAIL_FROM` env var, then a sensible fallback. */
  from?: string
}

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: 'no-api-key' | 'send-failed'; error?: unknown }

const DEFAULT_FROM_FALLBACK = 'noreply@drkhaledghattass.com'

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getResend()
  if (!resend) return { ok: false, reason: 'no-api-key' }

  const from =
    input.from ?? process.env.EMAIL_FROM ?? `Dr. Khaled Ghattass <${DEFAULT_FROM_FALLBACK}>`

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
    })
    if (error) {
      console.error('[email/send] resend returned error', error)
      return { ok: false, reason: 'send-failed', error }
    }
    return { ok: true, id: data?.id ?? null }
  } catch (err) {
    console.error('[email/send] threw', err)
    return { ok: false, reason: 'send-failed', error: err }
  }
}
