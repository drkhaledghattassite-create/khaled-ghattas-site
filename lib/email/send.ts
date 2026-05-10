/**
 * Single send wrapper around the email queue. All transactional email goes
 * through here so we get a uniform no-op-when-not-configured story plus
 * consistent error logging. Templates live alongside this file in
 * `./templates/`.
 *
 * Phase D2 — durable queue
 * ────────────────────────
 * In production, sendEmail does NOT call Resend synchronously. It enqueues
 * the rendered email into the `email_queue` table and returns immediately.
 * A Vercel cron at /api/cron/process-email-queue drains the queue with
 * retry + backoff (5 attempts, 1m / 5m / 15m / 1h schedule). The "ok"
 * return semantic shifted from "Resend accepted it" to "queued for
 * delivery" — admin can inspect actual delivery state at /admin/email-queue.
 *
 * Existing callers compile unchanged; the result type is backwards-compatible.
 * New callers should pass `emailType` (required for the queue row) and
 * `relatedEntityType` / `relatedEntityId` (so admin can trace queue rows
 * back to gifts / orders / questions / etc.).
 *
 * Dev preview mode
 * ────────────────
 * When `NODE_ENV !== 'production'` OR `MOCK_AUTH_ENABLED === 'true'`, real
 * Resend calls are skipped by default AND the queue is bypassed entirely.
 * Instead we:
 *   1. Log a clearly-tagged preview to the dev console
 *   2. Best-effort write the rendered HTML to
 *      `.next/cache/email-previews/{ts}-{to}.html` for inspection
 *
 * No queue row is created in dev preview mode — the file write IS the
 * artifact developers inspect.
 *
 * Escape hatches:
 *   - `EMAIL_FORCE_SEND=true` — bypass dev preview, hit Resend AND the
 *     queue in dev. Same code path as production.
 *   - `EMAIL_FORCE_SYNC=true` — bypass the queue entirely and send via
 *     Resend synchronously. Useful for the cron worker itself + dev
 *     debugging the Resend integration without waiting on the cron.
 *
 * Sender address selection
 * ────────────────────────
 * See `resolveFromAddress` below. On Vercel preview deploys (and locally
 * when `EMAIL_FORCE_SEND=true`) we send from Resend's pre-verified
 * sandbox address `onboarding@resend.dev`, which works with zero DNS but
 * only delivers to the Resend account owner's inbox. Production uses the
 * verified domain (override via `EMAIL_FROM`).
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { enqueueEmail, type EmailRelatedEntityType } from '@/lib/db/queries'
import { sendViaResend } from './queue-send'
import {
  buildQuestionAnsweredEmail,
  type QuestionAnsweredLocale,
} from './templates/question-answered'

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  /** Plain-text fallback. Strongly recommended — clients without HTML
   * support (or aggressive spam filters) drop messages without a text
   * part. Defaults to empty string for the rare caller that omits it. */
  text?: string
  /** Defaults to `EMAIL_FROM` env var, then a sensible per-env fallback. */
  from?: string
  /** Optional reply-to address (e.g., corporate inbox forwarding). */
  replyTo?: string
  /** Hint for the dev preview filename so the saved HTML is identifiable.
   * Falls back to 'email' when omitted. Independent of `emailType` —
   * dev preview can use a more descriptive label than the queue row's
   * discriminator. */
  previewLabel?: string
  /** Required in production. Drives queue routing + admin filtering.
   * Dev preview ignores it. Examples: 'gift_received', 'post_purchase'. */
  emailType?: string
  /** Loose pointer back to the business entity that triggered this send.
   * Lets admin email-queue detail link to the gift / order / question
   * the email is about. Optional but strongly encouraged. */
  relatedEntityType?: EmailRelatedEntityType | null
  /** UUID of the related entity. Skipped silently when malformed. */
  relatedEntityId?: string | null
}

export type SendEmailResult =
  | { ok: true; id: string | null; queued?: boolean }
  | {
      ok: false
      reason: 'no-api-key' | 'send-failed' | 'preview-only' | 'enqueue-failed'
      error?: unknown
    }

// Resend ships a pre-verified sandbox sender that requires zero DNS setup.
// Useful on dev + Vercel preview deploys where the production domain may
// not be verified yet (or where you only want to email the Resend account
// owner). When pointed at `onboarding@resend.dev`, Resend will deliver
// only to the email tied to your Resend account; everything else is
// dropped server-side.
const RESEND_TEST_FROM = 'Dr. Khaled Ghattass <onboarding@resend.dev>'
const PROD_FROM_FALLBACK = 'Dr. Khaled Ghattass <noreply@drkhaledghattass.com>'

/**
 * Resolve the `from` address with the following precedence:
 *   1. Explicit `input.from` on the sendEmail call (per-template override).
 *   2. `EMAIL_FROM` env var (set in Vercel / .env.local).
 *   3. Auto: `RESEND_TEST_FROM` on dev / Vercel preview deploys, the
 *      production fallback in real production (Vercel injects `VERCEL_ENV`
 *      = 'production' | 'preview' | 'development').
 *
 * Once the real domain is verified in Resend, you can drop `EMAIL_FROM`
 * entirely — production auto-uses the verified domain and previews keep
 * using the sandbox sender.
 */
function resolveFromAddress(explicit: string | undefined): string {
  if (explicit) return explicit
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM
  if (process.env.VERCEL_ENV !== 'production') return RESEND_TEST_FROM
  return PROD_FROM_FALLBACK
}

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

function isSyncBypass(): boolean {
  return process.env.EMAIL_FORCE_SYNC === 'true'
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
  // Dev preview short-circuit — runs BEFORE we touch the queue OR Resend,
  // so a dev box without an API key still gets full preview output.
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

  const from = resolveFromAddress(input.from)
  const text = input.text ?? ''

  // Sync bypass — used by the cron worker (which has already dequeued a
  // row and just wants to hit Resend) and the EMAIL_FORCE_SYNC dev path.
  // Skips the queue entirely.
  if (isSyncBypass()) {
    const result = await sendViaResend({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text,
      replyTo: input.replyTo ?? null,
    })
    if (result.ok) return { ok: true, id: result.id }
    if (result.error === 'no-api-key') return { ok: false, reason: 'no-api-key' }
    return { ok: false, reason: 'send-failed', error: result.error }
  }

  // Queue path. The row is the source of truth for delivery state; the
  // cron worker takes over from here.
  const recipient = input.to.trim().toLowerCase()
  const emailType = input.emailType ?? 'unknown'
  const row = await enqueueEmail({
    emailType,
    recipientEmail: recipient,
    subject: input.subject,
    htmlBody: input.html,
    textBody: text,
    fromAddress: from,
    replyTo: input.replyTo ?? null,
    relatedEntityType: input.relatedEntityType ?? null,
    relatedEntityId: input.relatedEntityId ?? null,
  })
  if (!row) {
    // Enqueue failed — typically DB unavailable. We don't fall back to a
    // synchronous send because the caller's "best effort" semantics
    // expect us to surface the failure for logging. If DB is down, the
    // upstream action handler decides whether to retry.
    console.error('[email/send] enqueueEmail returned null', {
      to: recipient,
      emailType,
    })
    return { ok: false, reason: 'enqueue-failed' }
  }
  return { ok: true, id: row.id, queued: true }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Phase B2 — admin-triggered "Your question has been answered" notification.
 *
 * Wraps `sendEmail` so the caller (updateQuestionStatusAction) gets a flat
 * { ok, reason } shape that matches its toast mapping. NEVER throws —
 * status updates must succeed even when email infra is unavailable. The
 * `'preview-only'` reason from dev-preview mode is normalised to ok=false
 * so the admin UI surfaces "no email sent" honestly in dev.
 * ──────────────────────────────────────────────────────────────────────── */

const DEFAULT_SUPPORT_EMAIL = 'Team@drkhaledghattass.com'

export type AnsweredEmailUser = {
  email: string
  name: string | null
  /** Asker's preferred locale. The User table doesn't carry a locale today,
   *  so this is typically passed as 'ar' (the site primary). When the field
   *  is added (Phase B3 or beyond), thread it through here. */
  locale?: QuestionAnsweredLocale
}

export type AnsweredEmailResult =
  | { ok: true; id: string | null }
  | {
      ok: false
      reason:
        | 'no-api-key'
        | 'send-failed'
        | 'preview-only'
        | 'invalid-recipient'
        | 'enqueue-failed'
    }

export async function sendAnsweredNotificationEmail(args: {
  user: AnsweredEmailUser
  question: { subject: string }
  answerUrl: string
  /** Question id — passed through to the queue row's relatedEntityId so
   * admin can trace this notification back to the question in /admin/questions. */
  questionId?: string
}): Promise<AnsweredEmailResult> {
  const recipient = args.user.email?.trim()
  if (!recipient) {
    console.warn('[email/sendAnsweredNotification] missing recipient email')
    return { ok: false, reason: 'invalid-recipient' }
  }
  const locale: QuestionAnsweredLocale = args.user.locale ?? 'ar'
  // SUPPORT_EMAIL is the canonical support inbox advertised in
  // transactional-email footers ("If you have any issue, contact us at
  // …"). It used to reuse CORPORATE_INBOX_EMAIL (the corporate-form
  // recipient inbox) — wrong namespace; corporate ≠ support. Both
  // fallback to the same `Team@drkhaledghattass.com` so split-config
  // production environments still work without setting both.
  const built = buildQuestionAnsweredEmail({
    locale,
    recipientName: args.user.name,
    questionSubject: args.question.subject,
    answerUrl: args.answerUrl,
    supportEmail: process.env.SUPPORT_EMAIL ?? DEFAULT_SUPPORT_EMAIL,
  })
  const result = await sendEmail({
    to: recipient,
    subject: built.subject,
    html: built.html,
    text: built.text,
    previewLabel: 'question-answered',
    emailType: 'question_answered',
    relatedEntityType: args.questionId ? 'question' : null,
    relatedEntityId: args.questionId ?? null,
  })
  if (result.ok) return { ok: true, id: result.id }
  return { ok: false, reason: result.reason }
}
