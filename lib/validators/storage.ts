/**
 * Validators for the admin upload pipeline.
 *
 * The request shape mirrors the spec's two-step upload flow: the client
 * declares (filename, MIME type, byte count, context) up front, the server
 * validates against the context-specific allowlist + size cap, and returns
 * a presigned PUT URL. The browser then PUTs the body directly to R2,
 * bypassing Vercel's 4.5 MB function payload limit.
 *
 * Context-aware MIME + size validation lives in `validateUploadRequest`
 * below so the route handler and the smoke harness can share one definition.
 *
 * Phase F2 broadened coverage from session items only (Phase F1) to every
 * admin surface that takes a URL paste: book covers + digital PDFs, tour
 * covers, event covers, article covers, gallery photos, and client logos.
 * SVG is rejected everywhere — embedded scripts are an XSS surface that
 * MIME-sniffing alone won't catch.
 */

import { z } from 'zod'

// Context tags — one per surface that can upload. Add more here as future
// surfaces come online. Order kept stable so existing entries don't move.
export const UPLOAD_CONTEXTS = [
  'session-item-video',
  'session-item-audio',
  'session-item-pdf',
  // Phase F2 additions:
  'book-cover',
  'book-digital-file',
  'tour-cover',
  'event-cover',
  'article-cover',
  'gallery-image',
  'client-logo',
  'program-cover',
  // Phase F2 gap-fix additions — interview thumbnails, booking covers,
  // and test covers. All share the IMAGE_MIME_TYPES allowlist and a 5 MB
  // cap (same shape as the original F2 image-context entries).
  'interview-thumbnail',
  'booking-cover',
  'test-cover',
] as const

export type UploadContext = (typeof UPLOAD_CONTEXTS)[number]

/**
 * Per-context allowed MIME types. Kept strict — admin can paste an external
 * URL for any other format. Broadening the list needs a deliberate decision
 * (e.g. .mov for video vs strictly .mp4). SVG is intentionally absent on
 * every image-accepting context — `<svg>` can embed `<script>` and `onload=`
 * handlers, so even a vetted-looking SVG can ship XSS at render time.
 */
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const ALLOWED_CONTENT_TYPES: Record<UploadContext, readonly string[]> = {
  'session-item-video': ['video/mp4'],
  'session-item-audio': ['audio/mpeg', 'audio/mp4'],
  'session-item-pdf': ['application/pdf'],
  // Image surfaces share the same MIME allowlist; the byte caps differ.
  'book-cover': IMAGE_MIME_TYPES,
  'tour-cover': IMAGE_MIME_TYPES,
  'event-cover': IMAGE_MIME_TYPES,
  'article-cover': IMAGE_MIME_TYPES,
  'gallery-image': IMAGE_MIME_TYPES,
  'client-logo': IMAGE_MIME_TYPES,
  'program-cover': IMAGE_MIME_TYPES,
  // Phase F2 gap-fix image contexts share the same MIME allowlist.
  'interview-thumbnail': IMAGE_MIME_TYPES,
  'booking-cover': IMAGE_MIME_TYPES,
  'test-cover': IMAGE_MIME_TYPES,
  // Books may ship a PDF digital file (separate from session-item PDFs).
  'book-digital-file': ['application/pdf'],
}

/**
 * Per-context size ceilings.
 *
 *   session-item-video    2 GB   — full lectures
 *   session-item-audio  200 MB   — audio chapters
 *   session-item-pdf     50 MB   — slide decks / handouts
 *   book-cover            5 MB   — JPEG/PNG/WebP cover art
 *   book-digital-file   200 MB   — full books can be hefty (illustrated print PDFs)
 *   tour-cover            5 MB
 *   event-cover           5 MB
 *   article-cover         5 MB
 *   gallery-image        10 MB   — gallery needs higher resolution
 *   client-logo           2 MB   — logos are small by design
 */
const MB = 1024 * 1024
const GB = 1024 * MB

export const MAX_BYTES: Record<UploadContext, number> = {
  'session-item-video': 2 * GB,
  'session-item-audio': 200 * MB,
  'session-item-pdf': 50 * MB,
  'book-cover': 5 * MB,
  'book-digital-file': 200 * MB,
  'tour-cover': 5 * MB,
  'event-cover': 5 * MB,
  'article-cover': 5 * MB,
  'gallery-image': 10 * MB,
  'client-logo': 2 * MB,
  'program-cover': 5 * MB,
  // Phase F2 gap-fix — 5 MB matches the other image-context caps.
  'interview-thumbnail': 5 * MB,
  'booking-cover': 5 * MB,
  'test-cover': 5 * MB,
}

export function maxSizeFor(context: UploadContext): number {
  return MAX_BYTES[context]
}

// Largest single-file ceiling across every context — used as the zod-layer
// upper bound. Per-context bounds are enforced in `validateUploadRequest`.
const ABSOLUTE_MAX_BYTES = Math.max(...Object.values(MAX_BYTES))

export const createUploadRequestSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(127),
  sizeBytes: z.number().int().nonnegative().max(ABSOLUTE_MAX_BYTES),
  contextType: z.enum(UPLOAD_CONTEXTS),
})

export type CreateUploadRequest = z.infer<typeof createUploadRequestSchema>

export type ValidateUploadResult =
  | { ok: true; data: CreateUploadRequest }
  | { ok: false; code: 'CONTENT_TYPE_NOT_ALLOWED' | 'SIZE_EXCEEDED'; message: string }

/**
 * Layered validation: zod gets the shape right (types + range), this layer
 * applies context-aware MIME + size rules that zod can't express cleanly.
 */
export function validateUploadRequest(
  input: CreateUploadRequest,
): ValidateUploadResult {
  const allowed = ALLOWED_CONTENT_TYPES[input.contextType]
  if (!allowed.includes(input.contentType)) {
    return {
      ok: false,
      code: 'CONTENT_TYPE_NOT_ALLOWED',
      message: `Content type ${input.contentType} not allowed for ${input.contextType}. Allowed: ${allowed.join(', ')}.`,
    }
  }
  const ceiling = maxSizeFor(input.contextType)
  if (input.sizeBytes > ceiling) {
    return {
      ok: false,
      code: 'SIZE_EXCEEDED',
      message: `File size ${input.sizeBytes} exceeds limit ${ceiling} for ${input.contextType}.`,
    }
  }
  return { ok: true, data: input }
}

/**
 * ASCII-only slugifier for the trailing segment of an R2 key. The R2 key
 * shape is `${contextType}/${uuid}/${slug}` — the uuid guarantees
 * uniqueness, the slug exists so the admin can read what's in the bucket
 * without round-tripping through the DB. Non-ASCII characters (Arabic file
 * names are common here) are stripped to avoid signing-header complexity;
 * the original filename is preserved on the DB row.
 */
export function slugifyFilename(filename: string): string {
  // Split off extension so we slugify the stem and re-attach.
  const dot = filename.lastIndexOf('.')
  const stem = dot > 0 ? filename.slice(0, dot) : filename
  const ext = dot > 0 ? filename.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, '') : ''
  const slug = stem
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^a-zA-Z0-9-_.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80)
    .toLowerCase()
  const safeStem = slug || 'file'
  return `${safeStem}${ext}`
}
