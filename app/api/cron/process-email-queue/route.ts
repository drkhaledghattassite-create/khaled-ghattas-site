/**
 * Phase D2 — Vercel cron worker that drains the email_queue.
 *
 * Triggered every 5 minutes by Vercel Cron (see vercel.json → crons[]).
 * Same auth pattern as /api/cron/expire-gifts: Bearer CRON_SECRET on
 * every request, fail-closed when the secret is unset.
 *
 * Per invocation:
 *   1. pickPendingEmails(BATCH_SIZE) — atomic SELECT ... FOR UPDATE
 *      SKIP LOCKED, flips the batch to SENDING in the same transaction
 *   2. For each picked row, sendViaResend(...)
 *   3. On Resend success: markEmailSent(id, resendMessageId)
 *   4. On Resend transient error: markEmailRetry(id, error)
 *      — bumps attemptCount, reschedules per backoff, or marks EXHAUSTED
 *        when the cap is hit
 *   5. On Resend permanent error: markEmailRetry too (same path); the
 *      attempt counter still walks toward EXHAUSTED, and admin can
 *      dead-letter manually before then if the error is clearly fatal
 *   6. Per-row try/catch so a single bad row doesn't poison the batch
 *
 * Concurrency: if a Vercel cron fires while a previous invocation is
 * still running, SKIP LOCKED ensures the new invocation simply picks
 * a different (or empty) batch instead of double-sending. The 60-second
 * maxDuration ceiling caps how long a single invocation can hold rows
 * in SENDING — if it actually hangs that long, the SENDING rows will be
 * "stuck" until a future invocation. (v2: add a sweeper that re-flips
 * SENDING rows older than 10 minutes back to PENDING.)
 *
 * Returns:
 *   { ok: true, picked, sent, retried, exhausted, errors }
 */

import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import {
  markEmailRetry,
  markEmailSent,
  pickPendingEmails,
} from '@/lib/db/queries'
import { sendViaResend } from '@/lib/email/queue-send'
import { MAX_EMAIL_ATTEMPTS } from '@/lib/email/backoff'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const BATCH_SIZE = 20

// QA P1 — timing-safe bearer compare. See expire-gifts/route.ts for the
// rationale; both cron endpoints use the same secret.
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? ''
  if (!secret) return false
  const auth = req.headers.get('authorization') ?? ''
  const parts = auth.split(' ')
  if (parts.length !== 2 || parts[0]!.toLowerCase() !== 'bearer') return false
  const provided = parts[1] ?? ''
  if (provided.length !== secret.length) return false
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(secret))
  } catch {
    return false
  }
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const batch = await pickPendingEmails(BATCH_SIZE)
    if (batch.length === 0) {
      return Response.json({
        ok: true,
        picked: 0,
        sent: 0,
        retried: 0,
        exhausted: 0,
      })
    }

    let sent = 0
    let retried = 0
    let exhausted = 0
    const errors: Array<{ id: string; error: string }> = []

    for (const row of batch) {
      try {
        const result = await sendViaResend({
          from: row.fromAddress,
          to: row.recipientEmail,
          subject: row.subject,
          html: row.htmlBody,
          text: row.textBody,
          replyTo: row.replyTo,
        })
        if (result.ok) {
          await markEmailSent(row.id, result.id)
          sent++
        } else {
          await markEmailRetry(row.id, result.error)
          // Detect whether this attempt was the last one — the queries
          // helper already flipped the status, we just count for the
          // response payload so cron logs surface "how many gave up".
          if (row.attemptCount + 1 >= MAX_EMAIL_ATTEMPTS) {
            exhausted++
          } else {
            retried++
          }
          errors.push({ id: row.id, error: result.error.slice(0, 200) })
        }
      } catch (err) {
        // Per-row crash: log + mark for retry so a single broken row
        // doesn't strand the rest of the batch in SENDING.
        const message = err instanceof Error ? err.message : 'unknown_error'
        console.error('[cron/process-email-queue] row failed', {
          id: row.id,
          err,
        })
        // The bare `.catch(() => undefined)` previously silenced this — if
        // markEmailRetry itself fails (e.g., the row was deleted, DB went
        // away mid-batch) the row stays in `SENDING` forever. Log so the
        // stranded row is at least discoverable in Vercel logs until the
        // v2 sweeper noted at the top of this file lands.
        await markEmailRetry(row.id, message).catch((retryErr) => {
          console.error(
            '[cron/process-email-queue] markEmailRetry FAILED — row stuck in SENDING',
            { id: row.id, retryErr },
          )
        })
        if (row.attemptCount + 1 >= MAX_EMAIL_ATTEMPTS) {
          exhausted++
        } else {
          retried++
        }
        errors.push({ id: row.id, error: message.slice(0, 200) })
      }
    }

    console.info('[cron/process-email-queue] drained batch', {
      picked: batch.length,
      sent,
      retried,
      exhausted,
    })
    return Response.json({
      ok: true,
      picked: batch.length,
      sent,
      retried,
      exhausted,
      errors,
    })
  } catch (err) {
    console.error('[cron/process-email-queue] sweep failed', err)
    return Response.json({ ok: false, error: 'sweep_failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
