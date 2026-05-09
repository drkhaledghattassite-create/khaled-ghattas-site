import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const RAW_URL = process.env.UPSTASH_REDIS_REST_URL ?? ''
const RAW_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? ''
const HAS_UPSTASH =
  !!RAW_URL &&
  !!RAW_TOKEN &&
  !RAW_URL.includes('dummy') &&
  !RAW_TOKEN.includes('dummy')

// Default rate-limit shape: 10 requests per 60 seconds, sliding window. Every
// pre-booking caller (newsletter, contact, content/access, reader/progress,
// session/progress, admin-site-settings) uses this shape implicitly. New
// callers can override via the optional config arg below — distinct
// (limit, window) combos get their own cached Ratelimit instance + their
// own Redis key prefix so counters don't collide.
const DEFAULT_LIMIT = 10
const DEFAULT_WINDOW: Duration = '60 s'

/**
 * Subset of `@upstash/ratelimit`'s Duration type — supports the units we
 * actually use. Adding `ms`, `h`, `d` later would require nothing here
 * beyond extending this template literal.
 */
type Duration = `${number} ${'s' | 'm'}`

export type RateLimitConfig = {
  /** Number of requests permitted per window. Default: 10. */
  limit?: number
  /** Sliding window length. Default: '60 s'. */
  window?: Duration
}

let redisSingleton: Redis | null = null
function getRedis(): Redis {
  if (redisSingleton) return redisSingleton
  redisSingleton = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  return redisSingleton
}

let defaultLimiter: Ratelimit | null = null
const customLimiters = new Map<string, Ratelimit>()

function getLimiter(config?: RateLimitConfig): Ratelimit | null {
  if (!HAS_UPSTASH) return null
  const limit = config?.limit ?? DEFAULT_LIMIT
  const window = config?.window ?? DEFAULT_WINDOW
  // Default config keeps the legacy `rl` prefix so existing Redis state
  // (counters from before this extension landed) stays valid. Custom
  // configs get a per-shape prefix to keep counters isolated.
  if (limit === DEFAULT_LIMIT && window === DEFAULT_WINDOW) {
    if (defaultLimiter) return defaultLimiter
    defaultLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(DEFAULT_LIMIT, DEFAULT_WINDOW),
      analytics: true,
      prefix: 'rl',
    })
    return defaultLimiter
  }
  const cacheKey = `${limit}:${window}`
  const existing = customLimiters.get(cacheKey)
  if (existing) return existing
  const created = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: `rl:${cacheKey}`,
  })
  customLimiters.set(cacheKey, created)
  return created
}

export type RateLimitResult = {
  ok: boolean
  headers: Record<string, string>
  remaining: number
  limit: number
  reset: number
}

export async function tryRateLimit(
  key: string,
  config?: RateLimitConfig,
): Promise<RateLimitResult> {
  const rl = getLimiter(config)
  const fallbackLimit = config?.limit ?? DEFAULT_LIMIT
  if (!rl) {
    return {
      ok: true,
      headers: { 'X-RateLimit-Bypass': 'no-redis' },
      remaining: fallbackLimit,
      limit: fallbackLimit,
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
      remaining: fallbackLimit,
      limit: fallbackLimit,
      reset: 0,
    }
  }
}
