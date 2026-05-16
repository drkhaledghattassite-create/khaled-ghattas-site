/**
 * POST /api/admin/storage/upload — Phase F1 / F3.
 *
 * Step 1 of the admin two-step upload flow:
 *   1. Client POSTs { filename, contentType, sizeBytes, contextType } here.
 *   2. We validate (origin + admin + per-context MIME + size cap), classify
 *      the context (PUBLIC vs PRIVATE bucket — Phase F3), mint a deterministic
 *      key, presign a 15-minute PUT URL against the chosen bucket, and return
 *      both.
 *   3. Client PUTs the file body directly to the URL (browser native).
 *   4. Client saves the returned `key` to the relevant DB column via the
 *      surface's normal update flow.
 *
 * Why presigned-PUT and not a streamed POST through our server: Vercel's
 * serverless function payload limit is 4.5 MB. A 2 GB lecture video would
 * never make it through, and we don't want to run a long-lived edge runtime
 * for uploads. The browser PUTs straight to R2.
 *
 * Phase F3 routing:
 *   - PUBLIC contexts (book-cover, gallery-image, ...) → `storagePublic`
 *     when configured, else fall back to the private adapter (single-bucket
 *     migration compat).
 *   - PRIVATE contexts (book-digital-file, session-item-*) → `storage`
 *     (the private adapter).
 *
 * The bucket choice is entirely server-side — the client never says which
 * bucket; the context-to-bucket mapping in `lib/validators/storage.ts` is
 * the single source of truth. An attacker who alters `contextType` on the
 * wire is still bound by the per-context MIME + size rules; the worst-case
 * outcome is uploading to the bucket that matches the chosen context.
 *
 * Orphan keys: if the client PUT succeeds but the row update fails (or
 * never runs because the admin closed the tab), the object exists in R2 with
 * no row pointing at it. There's no janitor job for this in v1 — admin
 * cleanup would be manual via the R2 dashboard or a future GC route.
 */

import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { requireAdmin } from '@/lib/auth/admin-guard'
import {
  errInternal,
  errRateLimited,
  errValidation,
  parseJsonBody,
} from '@/lib/api/errors'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import { storage, storagePublic } from '@/lib/storage'
import {
  bucketForContext,
  createUploadRequestSchema,
  slugifyFilename,
  validateUploadRequest,
} from '@/lib/validators/storage'

// Per-admin rate limit. Generous (60/min) since uploading several short
// audio chapters back-to-back is a normal flow.
export async function POST(req: Request) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const rl = await tryRateLimit(`admin-storage-upload:${guard.user.id}`, {
    limit: 60,
    window: '60 s',
  })
  if (!rl.ok) {
    return errRateLimited('Too many upload requests — please wait a moment.')
  }

  const body = await parseJsonBody(req, createUploadRequestSchema)
  if (!body.ok) return body.response

  const validated = validateUploadRequest(body.data)
  if (!validated.ok) {
    return errValidation({
      contentType:
        validated.code === 'CONTENT_TYPE_NOT_ALLOWED'
          ? [validated.message]
          : undefined,
      sizeBytes:
        validated.code === 'SIZE_EXCEEDED' ? [validated.message] : undefined,
    })
  }

  const { contextType, filename, contentType, sizeBytes, contentHash } = validated.data

  // Key shape — when a content hash is supplied, the second segment is the
  // hash (so identical bytes → identical key, enabling dedup). Otherwise
  // a fresh UUID (the original Phase F1 behavior for large files that
  // skip client-side hashing).
  const keySegment = contentHash ?? randomUUID()
  const key = `${contextType}/${keySegment}/${slugifyFilename(filename)}`

  // Phase F3 — pick the bucket adapter based on the context classification.
  // PUBLIC contexts route to the public bucket when it's configured; if not
  // (the single-bucket / pre-migration state), they fall back to the private
  // adapter. PRIVATE contexts always use the private adapter.
  const bucket = bucketForContext(contextType)
  const adapter =
    bucket === 'public' && storagePublic !== null ? storagePublic : storage

  try {
    // Dedup short-circuit: if the client computed a hash AND we already have
    // an object at this deterministic key, skip the presign + PUT entirely.
    // The client uses the returned `key` directly (form field gets populated
    // exactly as if a fresh upload had landed). Saves R2 PUTs, browser
    // bandwidth, and wall-clock wait time on re-uploads.
    if (contentHash) {
      const exists = await adapter.exists(key).catch(() => false)
      if (exists) {
        return NextResponse.json(
          {
            ok: true,
            key,
            deduplicated: true,
            // Null upload fields so a misconfigured client that ignores
            // `deduplicated` doesn't try to PUT to a fabricated URL.
            uploadUrl: null,
            expiresAt: null,
            method: null,
            headers: null,
          },
          { headers: rl.headers },
        )
      }
    }

    const presigned = await adapter.getPresignedPutUrl({
      key,
      contentType,
      maxSizeBytes: sizeBytes,
      ttlSeconds: 15 * 60,
    })
    return NextResponse.json(
      {
        ok: true,
        key,
        deduplicated: false,
        uploadUrl: presigned.url,
        expiresAt: presigned.expiresAt.toISOString(),
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
      },
      { headers: rl.headers },
    )
  } catch (err) {
    console.error('[api/admin/storage/upload POST]', err)
    return errInternal('Could not prepare the upload — please try again.')
  }
}
