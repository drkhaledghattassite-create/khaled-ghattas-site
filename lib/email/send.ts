/**
 * Single send wrapper around Resend. All transactional email goes through
 * here so we get a uniform no-op-when-not-configured story plus consistent
 * error logging. Templates live alongside this file in `./templates/`.
 *
 * Dev preview mode
 * ────────────────
 * When `NODE_ENV !== 'production'` OR `MOCK_AUTH_ENABLED === 'true'`, real
 * Resend calls are skipped by default. Instead we:
 *   1. Log a clearly-tagged preview to the dev console
 *   2. Best-effort write the rendered HTML to
 *      `.next/cache/email-previews/{ts}-{to}.html` for inspection
 *
 * This keeps Resend's quota clean during dev iteration and prevents fake
 * emails reaching real addresses while a developer is exercising the
 * checkout flow against a real customer-email account.
 *
 * Override: set `EMAIL_FORCE_SEND=true` in `.env.local` to actually call
 * Resend in dev — useful for "test the real Gmail render once before I
 * declare done."
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { getResend } from './index'

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  /** Optional plain-text fallback. Resend will auto-derive one if omitted. */
  text?: string
  /** Defaults to `EMAIL_FROM` env var, then a sensible fallback. */
  from?: string
  /** Hint for the dev preview filename so the saved HTML is identifiable.
   * Falls back to 'email' when omitted. */
  previewLabel?: string
}

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: 'no-api-key' | 'send-failed' | 'preview-only'; error?: unknown }

const DEFAULT_FROM_FALLBACK = 'noreply@drkhaledghattass.com'

function isDevPreviewMode(): boolean {
  if (process.env.EMAIL_FORCE_SEND === 'true') return false
  if (process.env.NODE_ENV !== 'production') return true
  // MOCK_AUTH_ENABLED has stricter semantics in lib/auth/mock.ts (computed
  // there with NODE_ENV gate), but reading the raw env here is enough for
  // a defensive "don't accidentally send real mail in mock mode" check.
  if (process.env.MOCK_AUTH === 'true') return true
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') return true
  return false
}

async function writePreview(
  input: SendEmailInput,
  text: string | null,
): Promise<string | null> {
  // Best-effort: if writing to disk fails (no permissions, missing
  // .next directory before first build, …) we fall back to console-only.
  try {
    const dir = path.join(process.cwd(), '.next', 'cache', 'email-previews')
    await fs.mkdir(dir, { recursive: true })
    const ts = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace(/T/, '_')
      .slice(0, 19)
    const safeTo = input.to.replace(/[^a-zA-Z0-9._-]/g, '_')
    const label = (input.previewLabel ?? 'email').replace(/[^a-zA-Z0-9._-]/g, '_')
    const file = path.join(dir, `${ts}-${label}-${safeTo}.html`)
    const banner = `<!--\n  Email preview\n  Subject: ${input.subject}\n  To: ${input.to}\n  Generated: ${new Date().toISOString()}\n-->\n`
    await fs.writeFile(file, banner + input.html, 'utf8')
    if (text) {
      await fs.writeFile(file.replace(/\.html$/, '.txt'), text, 'utf8')
    }
    return file
  } catch (err) {
    console.warn('[email/send] preview write failed', err)
    return null
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  // Dev preview short-circuit — runs BEFORE we even ask getResend(), so a
  // dev box without an API key still gets full preview output.
  if (isDevPreviewMode()) {
    const file = await writePreview(input, input.text ?? null)
    console.info(
      `[email/preview] ${input.previewLabel ?? 'email'} for ${input.to}`,
      {
        subject: input.subject,
        bytes: input.html.length,
        savedTo: file,
      },
    )
    if (input.text) {
      // Plain text gets dumped inline for quick scanning. HTML is too
      // long to log usefully — that's why we wrote it to disk.
      console.info(
        `[email/preview] plain text for ${input.to}:\n${input.text}`,
      )
    }
    return { ok: false, reason: 'preview-only' }
  }

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
