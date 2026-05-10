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

export interface StorageAdapter {
  getSignedUrl(input: GetSignedUrlInput): Promise<SignedUrlResult>
}
