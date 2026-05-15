/**
 * Storage adapter contract for the digital content delivery system.
 *
 * Every signed-URL flow on the site (book PDF download, session video stream,
 * post-purchase email link) flows through `StorageAdapter.getSignedUrl`. The
 * adapter is selected once in `lib/storage/index.ts` so swapping providers
 * (Vercel Blob, R2, Cloudflare Stream, etc.) is a one-import change.
 *
 * `productType` is intentionally narrower than `db.productType` — we only
 * differentiate at the storage layer between a "book" (single PDF asset) and a
 * "session item" (one item from a session: a video, an audio file, or a PDF).
 * The adapter is not responsible for ownership or authorization; that lives in
 * `app/api/content/access/route.ts`.
 *
 * Phase F1 extended the interface with admin-side primitives (`upload`,
 * `delete`, `exists`, `list`) so the admin upload UI can talk to the same
 * adapter that mints read URLs. The mock adapter implements the read path
 * (signed URLs pointing at `/placeholder-content/<key>`) but THROWS on the
 * admin-side primitives — those require a real provider (R2) to do anything
 * meaningful, and we want loud failure rather than silent "looks like it
 * worked" in dev.
 */

export type StorageProductType = 'BOOK' | 'SESSION_ITEM'

export type GetSignedUrlInput = {
  productType: StorageProductType
  /** UUID of the book (for BOOK) or the session_item (for SESSION_ITEM). */
  productId: string
  /** Opaque key returned by the row in the database. The adapter decides what
   * the format means — for a Vercel Blob adapter it's the blob pathname, for
   * an R2 adapter it's the object key, for Cloudflare Stream it's the video uid. */
  storageKey: string
  /** The user requesting the URL. Adapters may include this in audit logs or
   * scope short-lived signed URLs to the requester (e.g. with watermarking). */
  userId: string
  /** Defaults to 1 hour. Email-delivered links should pass 7 days. */
  expiresInSeconds?: number
}

export type SignedUrlResult = {
  url: string
  expiresAt: Date
}

/**
 * Admin-side primitives — Phase F1.
 *
 * Note the naming asymmetry with `GetSignedUrlInput`: these helpers take a
 * plain `key` and (where relevant) a `ttlSeconds` since they're not
 * product-scoped (the admin doesn't know which row will own the upload yet —
 * the key is minted, the row is updated afterwards). The existing
 * `GetSignedUrlInput` keeps its `storageKey` / `expiresInSeconds` shape so
 * every existing caller is untouched.
 */
export type UploadInput = {
  key: string
  body: Buffer | Uint8Array | Blob | ReadableStream | string
  contentType: string
}

export type UploadResult = {
  key: string
  /** Bytes written. Server-side uploads only — presigned PUTs (browser direct)
   * don't return a size from the adapter. */
  size: number | null
  contentType: string
  uploadedAt: Date
}

export type PresignedPutInput = {
  key: string
  contentType: string
  /** Defaults to 15 minutes. */
  ttlSeconds?: number
  /** Optional max content-length signed into the URL so the client can't
   * upload more than what was declared. Not enforced by every provider but
   * R2/S3 accept it via the `Content-Length` signed header. */
  maxSizeBytes?: number
}

export type PresignedPutResult = {
  url: string
  key: string
  expiresAt: Date
}

export type ListedObject = {
  key: string
  size: number
  lastModified: Date
}

export interface StorageAdapter {
  /** Read path — mints a short-lived URL for an existing object. */
  getSignedUrl(input: GetSignedUrlInput): Promise<SignedUrlResult>
  /** Server-side upload. For browser uploads use `getPresignedPutUrl`. */
  upload(input: UploadInput): Promise<UploadResult>
  /** Mint a short-lived URL the browser can PUT a file body to directly.
   * This is how the admin upload UI bypasses Vercel's 4.5 MB function payload
   * limit — the server only signs the URL, the browser ships the bytes. */
  getPresignedPutUrl(input: PresignedPutInput): Promise<PresignedPutResult>
  /** Soft-fail on missing — returns normally if the object doesn't exist. */
  delete(key: string): Promise<void>
  /** Returns true on 200, false on 404, throws on other transport errors. */
  exists(key: string): Promise<boolean>
  /** List objects under an optional prefix. */
  list(prefix?: string): Promise<ListedObject[]>
}

/**
 * Structured error thrown by every adapter method on failure. The original
 * provider error (S3 SDK error, network error, etc.) is preserved on `cause`
 * so callers can log it while presenting a stable error shape to the user.
 */
export class StorageError extends Error {
  readonly code: string

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StorageError'
    this.code = code
  }
}
