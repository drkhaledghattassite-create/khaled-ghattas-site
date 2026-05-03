import { Resend } from 'resend'

/**
 * Resend client is created lazily and only when `RESEND_API_KEY` is present.
 *
 * Returning `null` instead of throwing at module load is intentional: the
 * Stripe webhook imports the email layer transitively. If a key were
 * required to even load this module, every webhook would 500 in deployments
 * where the key isn't yet wired up — and Stripe would mark the endpoint
 * unhealthy. Graceful no-op preserves the order recording path; emails are
 * an enhancement, not a hard requirement, and missing-key environments log
 * a single warning per process.
 */

let cached: Resend | null = null
let warned = false

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    if (!warned) {
      warned = true
      console.warn(
        '[email] RESEND_API_KEY missing — email sends will be skipped',
      )
    }
    return null
  }
  if (cached) return cached
  cached = new Resend(key)
  return cached
}
