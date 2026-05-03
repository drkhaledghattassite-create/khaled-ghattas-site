/**
 * Mock storage adapter — local dev placeholder.
 *
 * Returns a `/placeholder-content/<storageKey>` path that resolves nowhere
 * meaningful (the directory is gitignored except for its README). The mock is
 * a contract test, not a working delivery path: it lets the rest of the
 * system (access API, library card, post-purchase email) be implemented and
 * type-checked before Dr. Khaled picks a real provider.
 *
 * Replace via `lib/storage/index.ts` once the storage decision is final.
 */

import type {
  GetSignedUrlInput,
  SignedUrlResult,
  StorageAdapter,
} from './types'

const DEFAULT_EXPIRY_SECONDS = 60 * 60 // 1 hour

let warned = false
function warnOnce() {
  if (warned) return
  warned = true
  console.warn(
    '[storage/mock] using mock adapter — replace with real adapter before production',
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
}
