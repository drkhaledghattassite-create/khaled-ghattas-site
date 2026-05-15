/**
 * Mock storage adapter — local dev placeholder.
 *
 * Returns a `/placeholder-content/<storageKey>` path that resolves nowhere
 * meaningful (the directory is gitignored except for its README). The mock is
 * a contract test, not a working delivery path: it lets the rest of the
 * system (access API, library card, post-purchase email) be implemented and
 * type-checked before Dr. Khaled picks a real provider.
 *
 * The Phase F1 admin-side primitives (`upload`, `getPresignedPutUrl`,
 * `delete`, `exists`, `list`) THROW with `StorageError('NOT_IMPLEMENTED', …)`.
 * Silent no-ops would make the upload UI look like it worked in dev while
 * leaving zero bytes in storage; loud failure is the move so a missing R2
 * config in preview blows up immediately and visibly.
 */

import {
  StorageError,
  type GetSignedUrlInput,
  type ListedObject,
  type PresignedPutInput,
  type PresignedPutResult,
  type SignedUrlResult,
  type StorageAdapter,
  type UploadInput,
  type UploadResult,
} from './types'

const DEFAULT_EXPIRY_SECONDS = 60 * 60 // 1 hour

let warned = false
function warnOnce() {
  if (warned) return
  warned = true
  console.warn(
    '[storage/mock] using mock adapter — set R2_* env vars to use the real adapter',
  )
}

function notImplemented(method: string): never {
  throw new StorageError(
    'NOT_IMPLEMENTED',
    `Storage method '${method}' is not implemented in the mock adapter. ` +
      'Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME ' +
      'in your environment to enable the Cloudflare R2 adapter.',
  )
}

export const mockAdapter: StorageAdapter = {
  async getSignedUrl(input: GetSignedUrlInput): Promise<SignedUrlResult> {
    warnOnce()
    const expiresInSeconds = input.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
    // The mock URL is a relative path under public/. It will 404 in dev — by
    // design. Phase 2+ tests will exercise the real adapter once chosen.
    const url = `/placeholder-content/${encodeURIComponent(input.storageKey)}`
    return { url, expiresAt }
  },

  // The four admin-side primitives intentionally throw — see the docstring
  // at the top of this file. Parameter types are preserved so the mock still
  // conforms to the StorageAdapter interface; the args themselves are
  // discarded.
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async upload(_input: UploadInput): Promise<UploadResult> {
    notImplemented('upload')
  },

  async getPresignedPutUrl(_input: PresignedPutInput): Promise<PresignedPutResult> {
    notImplemented('getPresignedPutUrl')
  },

  async delete(_key: string): Promise<void> {
    notImplemented('delete')
  },

  async exists(_key: string): Promise<boolean> {
    notImplemented('exists')
  },

  async list(_prefix?: string): Promise<ListedObject[]> {
    notImplemented('list')
  },
  /* eslint-enable @typescript-eslint/no-unused-vars */
}
