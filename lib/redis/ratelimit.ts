import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const RAW_URL = process.env.UPSTASH_REDIS_REST_URL ?? ''
const RAW_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? ''
const HAS_UPSTASH =
  !!RAW_URL &&
  !!RAW_TOKEN &&
  !RAW_URL.includes('dummy') &&
  !RAW_TOKEN.includes('dummy')

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
  try {
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
  } catch (err) {
    // Fail open when the Redis backend is unreachable (network error, bad URL,
    // misconfigured credentials). Better to allow a request through than to
    // 500 the caller when our rate-limit infrastructure itself is broken.
    console.error('[tryRateLimit]', err)
    return {
      ok: true,
      headers: { 'X-RateLimit-Bypass': 'redis-error' },
      remaining: 10,
      limit: 10,
      reset: 0,
    }
  }
}
