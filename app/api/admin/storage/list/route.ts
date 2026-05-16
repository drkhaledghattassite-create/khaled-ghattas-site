/**
 * GET /api/admin/storage/list — Phase F4 (media picker).
 *
 * Returns the objects currently in R2 under a given context prefix, so the
 * admin upload widget can offer a "Browse existing" picker — pull an already-
 * uploaded asset from the bucket instead of re-uploading the same file.
 *
 * Pairs with the content-hash dedup on the upload route: dedup short-circuits
 * the wasted PUT when the admin happens to upload the same bytes; the picker
 * is the proactive equivalent — pick from what's already there before you
 * upload anything at all.
 *
 *   ?context=<UploadContext>   required, must be one of UPLOAD_CONTEXTS
 *   ?search=<substring>        optional, case-insensitive filename filter
 *
 * Response shape:
 *   {
 *     ok: true,
 *     bucket: 'public' | 'private',
 *     items: Array<{
 *       key: string,            // full R2 key (what gets written to the column)
 *       filename: string,       // last segment, for display
 *       size: number,
 *       lastModified: string,   // ISO
 *       previewUrl: string | null,   // unsigned CDN URL for public contexts;
 *                                    // null for private contexts (signing
 *                                    // every list item would be expensive)
 *     }>,
 *     count: number,
 *     truncated: boolean,       // true when more than MAX_ITEMS objects exist
 *   }
 *
 * Bucket selection mirrors the upload route — `bucketForContext` decides
 * which adapter to list against. When the public adapter isn't configured
 * (single-bucket mode), public-context lists fall through to the private
 * adapter, same as Phase F2 read paths.
 *
 * Preview URLs: ONLY minted for public contexts when `R2_PUBLIC_URL` is set,
 * because they're unsigned + deterministic + cheap. Private contexts would
 * require minting a signed URL per item (1h TTL each, dozens of objects per
 * picker open) — instead the client falls back to filename + icon. Admins
 * can still preview a private item by selecting it (the form's existing
 * "view" affordance handles per-item signing on demand).
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, errValidation, errRateLimited } from '@/lib/api/errors'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import { storage, storagePublic, StorageError } from '@/lib/storage'
import {
  bucketForContext,
  isPublicContext,
  UPLOAD_CONTEXTS,
  type UploadContext,
} from '@/lib/validators/storage'

const MAX_ITEMS = 100

function normalizePublicBase(value: string): string {
  return value.replace(/\/+$/, '')
}

function filenameFromKey(key: string): string {
  const lastSlash = key.lastIndexOf('/')
  return lastSlash >= 0 ? key.slice(lastSlash + 1) : key
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  // 30 requests / min — opening the picker a few times across forms is the
  // typical pattern; this is generous without being a list-all-the-things
  // DoS vector.
  const rl = await tryRateLimit(`admin-storage-list:${guard.user.id}`, {
    limit: 30,
    window: '60 s',
  })
  if (!rl.ok) {
    return errRateLimited('Too many browse requests — please wait a moment.')
  }

  const url = new URL(req.url)
  const contextParam = url.searchParams.get('context')
  const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()

  if (!contextParam || !(UPLOAD_CONTEXTS as readonly string[]).includes(contextParam)) {
    return errValidation({
      context: [`Expected one of: ${UPLOAD_CONTEXTS.join(', ')}.`],
    })
  }
  const context = contextParam as UploadContext

  const bucket = bucketForContext(context)
  const adapter =
    bucket === 'public' && storagePublic !== null ? storagePublic : storage

  try {
    const all = await adapter.list(`${context}/`)

    // Sort newest first — admins almost always want the recent upload.
    const sorted = [...all].sort(
      (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
    )

    // Filter by filename substring (case-insensitive). The key shape is
    // `<context>/<uuid-or-hash>/<slug>`, so matching against the trailing
    // segment is what an admin actually expects ("find me cover-2024.jpg").
    const filtered = search
      ? sorted.filter((o) => filenameFromKey(o.key).toLowerCase().includes(search))
      : sorted

    const truncated = filtered.length > MAX_ITEMS
    const sliced = filtered.slice(0, MAX_ITEMS)

    // Preview URL minting — public contexts get the unsigned CDN URL when
    // R2_PUBLIC_URL is configured. Private contexts get null. The picker
    // renders thumbnails when it has previewUrl and filenames+icons when
    // it doesn't.
    const publicBase =
      isPublicContext(context) && process.env.R2_PUBLIC_URL
        ? normalizePublicBase(process.env.R2_PUBLIC_URL)
        : null

    const items = sliced.map((o) => ({
      key: o.key,
      filename: filenameFromKey(o.key),
      size: o.size,
      lastModified: o.lastModified.toISOString(),
      previewUrl: publicBase ? `${publicBase}/${o.key}` : null,
    }))

    return NextResponse.json(
      {
        ok: true,
        bucket,
        items,
        count: items.length,
        truncated,
      },
      { headers: rl.headers },
    )
  } catch (err) {
    // The mock adapter throws StorageError('NOT_IMPLEMENTED', ...) for `list`
    // — surface that as a 503 so the picker UI can show "unavailable in this
    // environment" rather than a generic INTERNAL.
    if (err instanceof StorageError && err.code === 'NOT_IMPLEMENTED') {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'STORAGE_UNAVAILABLE',
            message:
              'Browse-existing requires a real storage backend. Set R2_ACCOUNT_ID, ' +
              'R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME in .env.local ' +
              '(values must be non-empty) and restart the dev server.',
          },
        },
        { status: 503, headers: rl.headers },
      )
    }
    console.error('[api/admin/storage/list GET]', err)
    return errInternal('Could not list uploaded items — please try again.')
  }
}
