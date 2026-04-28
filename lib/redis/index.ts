import { Redis } from '@upstash/redis'

export const HAS_UPSTASH =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

let cached: Redis | null = null

export function getRedis(): Redis | null {
  if (!HAS_UPSTASH) return null
  if (cached) return cached
  cached = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  return cached
}

export { tryRateLimit, type RateLimitResult } from './ratelimit'
