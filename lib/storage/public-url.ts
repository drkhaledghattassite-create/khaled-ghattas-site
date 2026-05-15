/**
 * Public-URL resolver — Phase F2 / F3.
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
 *   - R2 storage key               → see Phase F3 routing below
 *
 * `isStorageKey(value)` is the sibling discriminator: true when the value
 * is non-empty and doesn't start with `http` or `/`.
 *
 * ─── Phase F3 routing ────────────────────────────────────────────────────
 * R2 keys are classified by `bucketForKey` (in `lib/validators/storage.ts`)
 * using the leading context-type prefix:
 *
 *   PUBLIC bucket + R2_PUBLIC_URL set
 *     → return `${R2_PUBLIC_URL}/${key}` unsigned. Deterministic per key
 *       (same key → same URL across requests), no signing overhead, no
 *       expiry, and a `next/image` CDN-friendly cache key.
 *
 *   PUBLIC bucket + R2_PUBLIC_URL unset (migration / single-bucket mode)
 *     → fall back to signing via the private adapter. The old single-
 *       bucket setup still works while the public-bucket migration is
 *       pending.
 *
 *   PRIVATE bucket
 *     → mint a signed URL via the private adapter (existing behavior).
 *
 *   Unknown prefix
 *     → `bucketForKey` throws; we catch and return null so a malformed
 *       row degrades to a placeholder rather than crashing the page.
 *
 * ─── Migration note ──────────────────────────────────────────────────────
 * When `R2_PUBLIC_URL` flips from unset → set, existing public-context
 * keys (e.g. `book-cover/<old-uuid>/<slug>.jpg`) start resolving to the
 * public CDN host. Those objects must already live in the public bucket
 * by then — otherwise covers 404 until they're copied over. This is a
 * one-time data move documented in CLAUDE.md's storage section.
 *
 * ─── Server-only ────────────────────────────────────────────────────────
 * Wrapped with `React.cache` for same-request memoization (the same key
 * returns the same URL within one render). React.cache is a SERVER-ONLY
 * primitive — this module must not be imported into a client component.
 * Public-facing pages render covers from Server Components anyway;
 * resolve there and pass the result down as props.
 *
 * ─── TTL choice (private-adapter fallback only) ──────────────────────────
 * Default 7 days (604 800 s) when we have to sign. Public covers are
 * rendered on the most-cacheable pages we have (the homepage, books
 * listing, etc.) and signing a URL for an hour means the rendered HTML's
 * image src goes stale right around the edge of Vercel's ISR window. A
 * 7-day signature comfortably outlasts any reasonable cache horizon.
 * Callers wanting a tighter TTL pass `{ ttlSeconds }`.
 */

import { cache } from 'react'
import { storage } from './index'
import { bucketForKey } from '@/lib/validators/storage'

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
  /** Defaults to 7 days. Only honored on the private-adapter signing
   * fallback — public-URL pass-through doesn't sign at all. */
  ttlSeconds?: number
}

/**
 * Trim trailing slashes from the configured `R2_PUBLIC_URL`. The bucket key
 * has no leading slash, so we always join with a single `/`; double slashes
 * would break the CDN host's path lookup.
 */
function normalizePublicBase(value: string): string {
  return value.replace(/\/+$/, '')
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

  // R2 storage key. Classify by prefix to decide public-CDN pass-through
  // vs signed-URL minting. `bucketForKey` THROWS on an unknown prefix —
  // catch and degrade to a placeholder (caller renders alt-text / fallback).
  let bucket: 'public' | 'private'
  try {
    bucket = bucketForKey(trimmed)
  } catch (err) {
    console.error('[storage/public-url] bucketForKey rejected key', {
      storageKey: trimmed,
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }

  // Public bucket with R2_PUBLIC_URL configured → unsigned CDN URL.
  // Deterministic per key, so React.cache memoization is purely an
  // optimization (no signing API call to dedupe). We DON'T memoize a
  // failure here — same input always yields the same output.
  if (bucket === 'public' && process.env.R2_PUBLIC_URL) {
    const base = normalizePublicBase(process.env.R2_PUBLIC_URL)
    // Key is `<context>/<uuid>/<slug>`; no leading slash. URL-encoding
    // happens at the final `<Image src>` level — R2 keys are already
    // slugified to ASCII-safe characters by `slugifyFilename`.
    return `${base}/${trimmed}`
  }

  // Public bucket but R2_PUBLIC_URL unset (single-bucket / migration mode),
  // OR private bucket → mint a signed URL via the private adapter. This is
  // the Phase F2 behavior preserved verbatim for backward compat.
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
