import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const HAS_UPSTASH =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

let limiter: Ratelimit | null = null

function getLimiter(): Ratelimit | null {
  if (!HAS_UPSTASH) return null
  if (limiter) return limiter
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    analytics: true,
    prefix: 'rl',
  })
  return limiter
}

export type RateLimitResult = {
  ok: boolean
  headers: Record<string, string>
  remaining: number
  limit: number
  reset: number
}

export async function tryRateLimit(key: string): Promise<RateLimitResult> {
  const rl = getLimiter()
  if (!rl) {
    return {
      ok: true,
      headers: { 'X-RateLimit-Bypass': 'no-redis' },
      remaining: 10,
      limit: 10,
      reset: 0,
    }
  }
  const { success, limit, remaining, reset } = await rl.limit(key)
  return {
    ok: success,
    headers: {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(reset),
    },
    remaining,
    limit,
    reset,
  }
}
