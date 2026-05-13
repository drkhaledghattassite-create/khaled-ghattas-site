/**
 * Storage layer entry point.
 *
 * ─── Why this abstraction exists ──────────────────────────────────────────
 * Dr. Khaled's storage provider is undecided as of Phase 1 (Vercel Blob,
 * Cloudflare R2, Cloudflare Stream, and Bunny.net are all under
 * consideration). Every other module in the digital-delivery system —
 * post-purchase email, /api/content/access, the future PDF reader, the future
 * session viewer — calls `storage.getSignedUrl(...)`. They get a URL +
 * expiry, nothing else. Provider details are confined here.
 *
 * ─── How to swap adapters ─────────────────────────────────────────────────
 * 1. Implement the `StorageAdapter` interface (see `./types.ts`) in a new
 *    file `./vercel-blob-adapter.ts` (or similar).
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

// QA P1 — production guard. The mock adapter serves /placeholder-content/<key>
// URLs (no signing, no TTL enforcement) — it's a dev contract test, not a
// production primitive. If a deploy lands without swapping `storage` to a real
// adapter (Vercel Blob / R2 / Cloudflare Stream / Bunny), every signed-URL
// caller silently leaks raw filesystem paths. Mirror the BETTER_AUTH_SECRET
// guard pattern in lib/auth/index.ts: refuse to boot on production until a
// real adapter is wired. Vercel preview + dev keep the mock so the team can
// iterate without provisioning storage.
//
// To swap: replace the `mockAdapter` import + `storage` binding below with the
// real adapter, then remove this guard.
if (
  process.env.NODE_ENV === 'production' &&
  process.env.VERCEL_ENV === 'production' &&
  process.env.ALLOW_MOCK_STORAGE_IN_PRODUCTION !== 'true'
) {
  throw new Error(
    '[lib/storage] Mock storage adapter cannot run in production. ' +
      'Swap `storage` in lib/storage/index.ts to a real adapter (Vercel Blob, ' +
      'R2, Cloudflare Stream, Bunny.net) before deploying. To explicitly opt ' +
      'in to the mock adapter on a production deployment (NOT recommended), ' +
      'set ALLOW_MOCK_STORAGE_IN_PRODUCTION=true.',
  )
}

export const storage: StorageAdapter = mockAdapter

export type { StorageAdapter, GetSignedUrlInput, SignedUrlResult, StorageProductType } from './types'
