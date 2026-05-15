/**
 * POST /api/admin/storage/upload — Phase F1.
 *
 * Step 1 of the admin two-step upload flow:
 *   1. Client POSTs { filename, contentType, sizeBytes, contextType } here.
 *   2. We validate (origin + admin + per-context MIME + size cap), mint a
 *      deterministic key, presign a 15-minute PUT URL, and return both.
 *   3. Client PUTs the file body directly to the URL (browser native).
 *   4. Client saves the returned `key` to the relevant DB column via the
 *      surface's normal update flow.
 *
 * Why presigned-PUT and not a streamed POST through our server: Vercel's
 * serverless function payload limit is 4.5 MB. A 2 GB lecture video would
 * never make it through, and we don't want to run a long-lived edge runtime
 * for uploads. The browser PUTs straight to R2.
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
import { storage } from '@/lib/storage'
import {
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

  const { contextType, filename, contentType, sizeBytes } = validated.data
  const key = `${contextType}/${randomUUID()}/${slugifyFilename(filename)}`

  try {
    const presigned = await storage.getPresignedPutUrl({
      key,
      contentType,
      maxSizeBytes: sizeBytes,
      ttlSeconds: 15 * 60,
    })
    return NextResponse.json(
      {
        ok: true,
        key,
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
