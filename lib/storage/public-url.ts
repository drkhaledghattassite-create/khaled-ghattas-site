/**
 * Public-URL resolver — Phase F2.
 *
 * Public covers and other cosmetic R2 assets use this. Protected paid content
 * (book PDFs, session items) goes through /api/content/access on demand.
 *
 * ─── Contract ───────────────────────────────────────────────────────────
 * `resolvePublicUrl(value)` accepts whatever a `cover_image` / `logo_url`
 * column might hold and returns a fully-resolved URL string ready to feed
 * into `<Image src={...}>`:
 *
 *   - `null` / `undefined` / `''`  → null   (caller decides on a placeholder)
 *   - `'http://…'` / `'https://…'` → passed through verbatim (external URL,
 *                                    legacy data, vendor link)
 *   - `'/static/path.jpg'`         → passed through verbatim (public/ asset)
 *   - anything else                → treated as an R2 storage key; a signed
 *                                    URL is minted via the storage adapter
 *
 * `isStorageKey(value)` is the sibling discriminator: true when the value
 * is non-empty and doesn't start with `http` or `/`.
 *
 * ─── Server-only ────────────────────────────────────────────────────────
 * Wrapped with `React.cache` for same-request memoization (the same key
 * returns the same URL within one render). React.cache is a SERVER-ONLY
 * primitive — this module must not be imported into a client component.
 * Public-facing pages render covers from Server Components anyway;
 * resolve there and pass the result down as props.
 *
 * ─── TTL choice ─────────────────────────────────────────────────────────
 * Default 7 days (604 800 s). Public covers are rendered on the most-
 * cacheable pages we have (the homepage, books listing, etc.) and signing
 * a URL for an hour means the rendered HTML's image src goes stale right
 * around the edge of Vercel's ISR window. A 7-day signature comfortably
 * outlasts any reasonable cache horizon. Callers wanting a tighter TTL
 * pass `{ ttlSeconds }`.
 */

import { cache } from 'react'
import { storage } from './index'

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

/**
 * True when `value` looks like an R2 storage key — non-empty and doesn't
 * begin with `http` (external URL) or `/` (local public asset).
 *
 * Pure, sync, safe to call from anywhere (server or client).
 */
export function isStorageKey(value: string | null | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return false
  if (trimmed.startsWith('/')) return false
  return true
}

type ResolveOptions = {
  /** Defaults to 7 days. */
  ttlSeconds?: number
}

/**
 * The actual resolver — wrapped with React.cache for per-request memoization.
 * Marked `async` so callers can `await` it; pass-through branches resolve
 * synchronously inside the Promise.
 */
async function resolvePublicUrlInner(
  value: string | null | undefined,
  opts: ResolveOptions = {},
): Promise<string | null> {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  if (trimmed.startsWith('/')) {
    return trimmed
  }

  // R2 storage key — mint a signed URL.
  // We use the BOOK productType + a placeholder productId for public covers;
  // the adapter doesn't enforce ownership at this layer (that's
  // /api/content/access's job for paid content). The audit-log line will
  // identify these as "public" rather than tying them to a real user id.
  try {
    const signed = await storage.getSignedUrl({
      productType: 'BOOK',
      productId: 'public-cover',
      storageKey: trimmed,
      userId: 'public',
      expiresInSeconds: opts.ttlSeconds ?? DEFAULT_TTL_SECONDS,
    })
    return signed.url
  } catch (err) {
    // A bad key shouldn't crash the page — surface as a placeholder.
    console.error('[storage/public-url] resolvePublicUrl failed', {
      storageKey: trimmed,
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * React.cache memoizes by argument identity per server-render. Same value +
 * same opts identity inside one render returns the same Promise. The
 * one-argument shape below means options identity matters less in practice
 * (most callers pass a single string) — for the common case the cache hits.
 */
export const resolvePublicUrl = cache(resolvePublicUrlInner)
