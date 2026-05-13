import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import { apiError } from '@/lib/api/errors'
import { getClientIp } from '@/lib/api/client-ip'

const handlers = toNextJsHandler(auth.handler)

// SECURITY [H-2]: Better Auth's catch-all serves sign-in, sign-up,
// forgot-password, and OAuth flows over POST. Without rate limiting these
// are brute-forceable. We wrap POST with the shared `tryRateLimit` helper
// (Upstash sliding-window, 10/min/IP per the limiter's defaults).
//
// Fail-open: if Upstash is unconfigured or unreachable, `tryRateLimit`
// allows the request through and logs the bypass. Auth flows shouldn't
// fully break in dev without Redis, and a Redis outage shouldn't take down
// sign-in either — but operators should monitor `X-RateLimit-Bypass`
// response headers to notice when the limiter is down.
//
// GET is intentionally NOT rate-limited:
//   - `/api/auth/get-session` is polled by `useSession()` on the client and
//     a 10/min cap would break the session UI.
//   - OAuth callbacks and reset-password verification GETs carry random
//     unbruteforceable tokens, so per-IP limits add no security value.
export async function POST(req: Request) {
  // QA P1 — spoof-resistant IP. See lib/api/client-ip.ts.
  const ip = getClientIp(req)
  const rl = await tryRateLimit(`auth:${ip}`)
  if (!rl.ok) {
    const res = apiError(
      'RATE_LIMITED',
      'Too many authentication attempts. Please try again in a minute.',
    )
    for (const [k, v] of Object.entries(rl.headers)) res.headers.set(k, v)
    return res
  }
  return handlers.POST(req)
}

export const GET = handlers.GET
