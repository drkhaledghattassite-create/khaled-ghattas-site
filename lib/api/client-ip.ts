/**
 * QA P1 — client IP resolution that resists client spoofing.
 *
 * Why this isn't a one-liner: `x-forwarded-for` is a comma-separated chain
 * (client → proxy1 → proxy2 → ours). The LEFTMOST hop is whatever the
 * original client wrote — fully attacker-controlled. Naive code that does
 * `forwarded.split(',')[0]` is using the spoofed value as the rate-limit
 * key, which means anyone who knows about this can rotate fake IPs in the
 * header to bypass per-IP limits.
 *
 * Correct precedence on Vercel:
 *   1. `x-vercel-forwarded-for` — set by Vercel's edge directly from the
 *      TCP connection. Not echoable by the client.
 *   2. RIGHTMOST entry of `x-forwarded-for` — whatever our trusted edge
 *      appended, not what the client wrote.
 *   3. `x-real-ip` — last-resort fallback for self-hosted reverse proxies.
 *
 * Returns `CLIENT_IP_FALLBACK` when nothing resolves. Downstream rate-
 * limit keys hash collisions on the fallback into a single bucket —
 * strictest possible behavior when the spoofing-defeated path returned
 * nothing.
 *
 * IMPORTANT: do NOT call this from server actions — those have their own
 * IP-resolution helper (`getRequestIp` in `gifts/actions.ts`) that reads
 * from `next/headers`. This helper is for route handlers that receive a
 * `Request` argument. Both helpers MUST use the same `CLIENT_IP_FALLBACK`
 * sentinel so a future caller that switches between the two helpers
 * doesn't silently re-key its rate-limit bucket (audit Phase H R-2).
 */
export const CLIENT_IP_FALLBACK = 'anon'

export function getClientIp(req: Request): string {
  const vercelIp = req.headers.get('x-vercel-forwarded-for')?.trim()
  if (vercelIp) return vercelIp

  const forwarded = req.headers.get('x-forwarded-for') ?? ''
  if (forwarded) {
    const parts = forwarded
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const rightmost = parts[parts.length - 1]
    if (rightmost) return rightmost
  }

  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real

  return CLIENT_IP_FALLBACK
}
