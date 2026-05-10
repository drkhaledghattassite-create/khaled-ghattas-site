/**
 * Phase D2 — exponential-ish backoff schedule for the email retry queue.
 *
 * `attemptCount` is the count AFTER the attempt that just failed.
 *   attempt 1 failed → schedule attempt 2 in 1 minute
 *   attempt 2 failed → schedule attempt 3 in 5 minutes
 *   attempt 3 failed → schedule attempt 4 in 15 minutes
 *   attempt 4 failed → schedule attempt 5 in 1 hour
 *   attempt 5 failed → EXHAUSTED (no further automatic attempts)
 *
 * The admin can manually retry an EXHAUSTED row from /admin/email-queue;
 * doing so resets nextAttemptAt to now() without resetting attemptCount,
 * so the next failure still trips EXHAUSTED on the 6th attempt unless
 * the admin keeps clicking. This is intentional — five automatic tries
 * is enough; beyond that it's an operations decision.
 *
 * Exported as a const tuple so the admin UI can render the schedule
 * verbatim ("Next retry in 5 minutes") without re-deriving it.
 */

export const BACKOFF_SCHEDULE_MS = [
  60 * 1000, // attempt 1 → +1 minute
  5 * 60 * 1000, // attempt 2 → +5 minutes
  15 * 60 * 1000, // attempt 3 → +15 minutes
  60 * 60 * 1000, // attempt 4 → +1 hour
] as const

export const MAX_EMAIL_ATTEMPTS = 5

/**
 * Returns the milliseconds to wait before the next attempt, OR null
 * when the caller should mark the row EXHAUSTED instead of retrying.
 *
 * `attemptCount` is the post-increment value — i.e., the number of
 * attempts already executed (including the one that just failed).
 */
export function backoffFor(attemptCount: number): number | null {
  if (attemptCount < 1) return BACKOFF_SCHEDULE_MS[0]
  if (attemptCount >= MAX_EMAIL_ATTEMPTS) return null
  return BACKOFF_SCHEDULE_MS[attemptCount - 1] ?? null
}

/**
 * Compute the next attempt timestamp given the just-incremented attempt
 * count. Returns null when no further attempts should be made.
 */
export function nextAttemptDateFor(attemptCount: number): Date | null {
  const ms = backoffFor(attemptCount)
  if (ms == null) return null
  return new Date(Date.now() + ms)
}
