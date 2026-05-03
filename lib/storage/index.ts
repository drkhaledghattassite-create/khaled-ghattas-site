/**
 * Storage layer entry point.
 *
 * ─── Why this abstraction exists ──────────────────────────────────────────
 * Dr. Khaled's storage provider is undecided as of Phase 1 (Netlify Blobs,
 * Cloudflare R2, Cloudflare Stream, and Bunny.net are all under
 * consideration). Every other module in the digital-delivery system —
 * post-purchase email, /api/content/access, the future PDF reader, the future
 * session viewer — calls `storage.getSignedUrl(...)`. They get a URL +
 * expiry, nothing else. Provider details are confined here.
 *
 * ─── How to swap adapters ─────────────────────────────────────────────────
 * 1. Implement the `StorageAdapter` interface (see `./types.ts`) in a new
 *    file `./netlify-blobs-adapter.ts` (or similar).
 * 2. Replace the `storage` export below with the new adapter.
 * 3. Add any provider env vars to `.env.local.example` and the deployment.
 * 4. NO other files need to change. If they do, we got the abstraction wrong.
 *
 * Optional future enhancement: select an adapter by `process.env.STORAGE_PROVIDER`
 * at boot, falling back to the mock when absent. We're not doing that yet —
 * one decision, one file, no premature configuration.
 */

import { mockAdapter } from './mock-adapter'
import type { StorageAdapter } from './types'

export const storage: StorageAdapter = mockAdapter

export type { StorageAdapter, GetSignedUrlInput, SignedUrlResult, StorageProductType } from './types'
