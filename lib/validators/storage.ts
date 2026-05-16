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

/**
 * Discriminator for admin form fields that can hold EITHER a legacy
 * external `http(s)://` URL or a new R2 storage key (post-F1 upload).
 *
 * Returns true for:
 *   - http://… / https://… URLs (legacy paste-in pattern)
 *   - R2 keys whose leading prefix is a known UploadContext —
 *     `<contextType>/<uuid>/<slug>` — validated via `bucketForKey`
 *
 * Returns false for empty strings, local `/public/` paths, and unknown
 * prefixes (which would silently leak placeholder content or 404 in
 * production). Callers wrap with `.or(z.literal(''))` if empty is valid.
 *
 * Why this exists: before F1, `digitalFile` / `coverImageUrl` were paste-
 * in URLs validated with `.url()`. After the upload widget landed, those
 * fields can also receive R2 keys, but Zod's `.url()` rejects non-URL
 * strings — admins saw "Invalid URL" the moment they uploaded a file.
 * This helper unblocks the upload path without weakening URL validation
 * for fields that are still genuinely external (videoUrl, websiteUrl,
 * externalBookingUrl, etc. — those keep `.url()`).
 */
export function isUrlOrStorageKey(value: string): boolean {
  if (!value) return false
  if (/^https?:\/\//.test(value)) return true
  try {
    bucketForKey(value)
    return true
  } catch {
    return false
  }
}

export const urlOrStorageKey = z
  .string()
  .refine(isUrlOrStorageKey, { message: 'invalid-url-or-key' })

export const createUploadRequestSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(127),
  sizeBytes: z.number().int().nonnegative().max(ABSOLUTE_MAX_BYTES),
  contextType: z.enum(UPLOAD_CONTEXTS),
  /**
   * Optional SHA-256 of the file body, hex-encoded (64 chars). When present,
   * the server uses the hash as the key's second segment instead of a fresh
   * UUID, so two uploads of identical bytes land on the same R2 object.
   *
   * The server then `HEAD`s that key — if the object already exists, it
   * short-circuits the presigned-PUT mint and tells the client to skip
   * the upload entirely (`{ deduplicated: true }`).
   *
   * Why optional, not required: hashing a 2 GB lecture video client-side
   * is slow + memory-heavy on mobile. The widget skips hashing for files
   * over 50 MB and falls back to UUID-based keys (current behavior). For
   * files under the threshold, dedup is cheap and silent.
   *
   * 64-char hex (the full SHA-256) is overkill collision-wise but uses zero
   * extra storage on the R2 object and reads cleanly in the dashboard.
   */
  contentHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/, 'invalid-sha256-hex')
    .optional(),
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

/* ─── Phase F3 ─ Public/Private bucket classification ──────────────────────
 *
 * R2 storage is split into two buckets:
 *
 *   PUBLIC bucket   — cosmetic images served unsigned. Covers, logos,
 *                     gallery photos, program/event/article/tour/test/
 *                     interview/booking thumbnails. Public-read enabled
 *                     in Cloudflare; delivered via `R2_PUBLIC_URL`.
 *   PRIVATE bucket  — paid content delivered through signed URLs only.
 *                     Book PDFs, session videos, session audio, session
 *                     PDFs. Public access OFF on the bucket.
 *
 * The classification is one-place-fixed: add a new UploadContext above and
 * tsc will FAIL unless you also classify it in exactly one of the two
 * arrays below. The `_exhaustive` and `_disjoint` compile-time assertions
 * at the bottom enforce both directions — every context must be in some
 * bucket, and no context may be in both.
 *
 * `bucketForKey` parses the R2 object key shape `<contextType>/<uuid>/<slug>`
 * to route reads. It THROWS on an unknown prefix so a typo in a DB row can't
 * silently leak paid content via the public delivery path. Callers must
 * wrap in try/catch when the key origin is untrusted (see
 * `lib/storage/public-url.ts` — the resolver catches and returns null so
 * a bad row degrades to a placeholder rather than crashing the page).
 */

export const PUBLIC_CONTEXTS = [
  'book-cover',
  'tour-cover',
  'event-cover',
  'article-cover',
  'gallery-image',
  'client-logo',
  'program-cover',
  'interview-thumbnail',
  'booking-cover',
  'test-cover',
] as const satisfies readonly UploadContext[]

export const PRIVATE_CONTEXTS = [
  'book-digital-file',
  'session-item-video',
  'session-item-audio',
  'session-item-pdf',
] as const satisfies readonly UploadContext[]

export type PublicContext = (typeof PUBLIC_CONTEXTS)[number]
export type PrivateContext = (typeof PRIVATE_CONTEXTS)[number]

// Pre-computed Sets so isPublicContext / bucketForContext are O(1) at
// runtime rather than O(n) over the readonly tuple. Both Sets are typed
// as Set<string> deliberately — the input type is the narrower UploadContext
// union but the Set storage is just strings.
const PUBLIC_CONTEXT_SET: ReadonlySet<string> = new Set(PUBLIC_CONTEXTS)
const PRIVATE_CONTEXT_SET: ReadonlySet<string> = new Set(PRIVATE_CONTEXTS)

export function isPublicContext(context: UploadContext): context is PublicContext {
  return PUBLIC_CONTEXT_SET.has(context)
}

export function bucketForContext(context: UploadContext): 'public' | 'private' {
  return isPublicContext(context) ? 'public' : 'private'
}

/**
 * Classify an R2 storage key by its leading context-type prefix.
 *
 * Keys are minted as `<contextType>/<uuid>/<slug>` by
 * `app/api/admin/storage/upload/route.ts`. We slice up to the first `/` and
 * look it up in the two classification sets.
 *
 * Throws when the prefix is not a known UploadContext — a defensive choice
 * so a typo in a DB row (e.g. `book_cover/...` instead of `book-cover/...`)
 * blows up loudly rather than silently routing through the public/CDN path
 * and leaking paid content.
 */
export function bucketForKey(key: string): 'public' | 'private' {
  const slash = key.indexOf('/')
  // No slash → it's not a key in our `<context>/<uuid>/<slug>` shape. Refuse
  // rather than guessing; callers should wrap in try/catch (the public-URL
  // resolver does — see `lib/storage/public-url.ts`).
  const prefix = slash > 0 ? key.slice(0, slash) : key
  if (PUBLIC_CONTEXT_SET.has(prefix)) return 'public'
  if (PRIVATE_CONTEXT_SET.has(prefix)) return 'private'
  throw new Error(
    `bucketForKey: unknown context prefix '${prefix}'. Expected one of: ` +
      `${[...PUBLIC_CONTEXTS, ...PRIVATE_CONTEXTS].join(', ')}.`,
  )
}

/* ─── Compile-time exhaustiveness + disjointness ──────────────────────────
 *
 * If you add a new entry to UPLOAD_CONTEXTS above and forget to put it in
 * exactly one of PUBLIC_CONTEXTS / PRIVATE_CONTEXTS, tsc will fail to
 * compile this file. The two checks cover both directions:
 *
 *   _MissingFromBuckets    — every UploadContext is in at least one list
 *   _OverlapBetweenBuckets — no UploadContext is in BOTH lists
 *
 * A duplicate (same context listed as both public and private) is the more
 * dangerous misclassification — paid content silently routed through the
 * public path — so we guard both directions, not just the missing case.
 */
type _MissingFromBuckets = Exclude<
  UploadContext,
  (typeof PUBLIC_CONTEXTS)[number] | (typeof PRIVATE_CONTEXTS)[number]
>
type _OverlapBetweenBuckets = (typeof PUBLIC_CONTEXTS)[number] &
  (typeof PRIVATE_CONTEXTS)[number]
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _exhaustive: [_MissingFromBuckets] extends [never] ? true : never = true
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _disjoint: [_OverlapBetweenBuckets] extends [never] ? true : never = true
