/**
 * Shared helper: resolve a cover-image field (R2 storage key, full URL, or
 * /-prefixed local asset) into an absolute https URL safe to pass into a
 * Stripe Checkout `line_items[].price_data.product_data.images[]` entry.
 *
 * Stripe fetches images server-side from the public internet, so they must
 * be:
 *   - absolute http(s) URLs (no relative paths)
 *   - not point at localhost (Stripe's edge can't reach the dev box)
 *
 * Why this exists: prior to this helper, each checkout flow rolled its own
 * URL guard. The books flow (`pickPublicImageUrl` in
 * `app/api/checkout/route.ts`) called `new URL(trimmed)` with no base, so
 * a bare R2 storage key (`book-cover/<uuid>/<slug>.jpg`) threw and the
 * `images` field went silently undefined — Stripe checkout for every
 * R2-uploaded cover rendered without art. Booking + gift flows never set
 * `images` at all.
 *
 * Now: every flow runs `resolvePublicUrl` first (which knows how to turn
 * an R2 key into either an unsigned public-CDN URL or a signed-URL
 * fallback), then this helper validates the result is something Stripe
 * can fetch. Returns null on anything unfit — caller passes
 * `images: url ? [url] : undefined`.
 */

import { resolvePublicUrl } from '@/lib/storage/public-url'
import { SITE_URL } from '@/lib/constants'

export async function resolveStripeImageUrl(
  rawCover: string | null | undefined,
): Promise<string | null> {
  if (!rawCover) return null
  const resolved = await resolvePublicUrl(rawCover)
  if (!resolved) return null
  const trimmed = resolved.trim()
  if (!trimmed) return null

  let parsed: URL
  try {
    parsed = trimmed.startsWith('/')
      ? new URL(trimmed, SITE_URL)
      : new URL(trimmed)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  const host = parsed.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
    return null
  }
  return parsed.toString()
}
