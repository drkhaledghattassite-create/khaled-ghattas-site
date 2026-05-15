/**
 * Storage layer entry point.
 *
 * ─── Selection logic (Phase F1) ───────────────────────────────────────────
 * Order, evaluated once at module load:
 *   1. If all four R2 env vars are present (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 *      R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) → Cloudflare R2 adapter.
 *   2. Else if ALLOW_MOCK_STORAGE_IN_PRODUCTION === 'true' on a production
 *      Vercel deploy → mock adapter (explicit escape hatch, currently set
 *      until the parent agent confirms R2 credentials live in prod).
 *   3. Else if NODE_ENV !== 'production' → mock adapter (dev default).
 *   4. Else → throw at module load with a clear error listing the missing
 *      vars. We refuse to silently downgrade to mock in production because
 *      the mock serves `/placeholder-content/<key>` paths that leak filesystem
 *      structure and don't actually deliver content.
 *
 * The R2 adapter file itself THROWS at import time when its env vars are
 * missing. To avoid bricking dev (which has no R2 credentials), we import it
 * lazily via `require` only when the env check above passes. Same idea as
 * a conditional dynamic import, but synchronous so the export below stays a
 * plain value rather than a Promise.
 *
 * ─── Phase F3 — public + private buckets ─────────────────────────────────
 * `storagePublic` is the optional public-bucket adapter, exported as
 * `StorageAdapter | null`. It is non-null only when:
 *   - The four standard R2 env vars are present (account creds + private
 *     bucket name), AND
 *   - R2_PUBLIC_BUCKET_NAME is set.
 *
 * When `storagePublic` is null, callers fall back to the existing `storage`
 * adapter (the private bucket) — that's the pre-split / single-bucket
 * migration state. Routing logic lives in:
 *   - `lib/storage/public-url.ts` (read path: covers + cosmetic images)
 *   - `app/api/admin/storage/upload/route.ts` (write path: presigned PUTs)
 *   - `app/api/content/access/route.ts` (read path: paid content)
 *
 * ─── Diagnostics ──────────────────────────────────────────────────────────
 * `diagnoseStorageAdapter()` returns `{ adapter, reason, missingEnvVars?,
 * publicAdapter, publicReason }` for the smoke harness and any future admin
 * "what storage am I using" surface. It runs the selection logic in pure
 * form (no side effects, no module-load throws) and reports the same
 * decision.
 */

import { mockAdapter } from './mock-adapter'
import type { StorageAdapter } from './types'

const R2_ENV_VARS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
] as const

export type AdapterDiagnosis = {
  adapter: 'r2' | 'mock'
  reason: string
  missingEnvVars?: string[]
  /** Phase F3 — state of the public-bucket adapter:
   *   'r2'           — R2_PUBLIC_BUCKET_NAME is set; public uploads route there
   *   'unconfigured' — env var missing; callers fall back to the private adapter
   */
  publicAdapter: 'r2' | 'unconfigured'
  publicReason: string
}

/**
 * Pure decision function — same logic as the boot-time selector below but
 * with no side effects and no throws. Useful for the smoke harness and for
 * an admin "current storage backend" indicator. Reading from an explicit env
 * object (rather than `process.env` directly) keeps it unit-testable.
 */
export function decideStorageAdapter(
  env: Record<string, string | undefined> = process.env,
):
  | { kind: 'r2'; reason: string; publicAdapter: 'r2' | 'unconfigured'; publicReason: string }
  | { kind: 'mock'; reason: string; publicAdapter: 'r2' | 'unconfigured'; publicReason: string }
  | {
      kind: 'throw'
      reason: string
      missingEnvVars: string[]
      publicAdapter: 'r2' | 'unconfigured'
      publicReason: string
    } {
  const missing = R2_ENV_VARS.filter((name) => !env[name])

  // Phase F3 — public-bucket diagnosis. Reported independently of the
  // private-adapter decision so callers can see e.g. "private=r2, public=
  // unconfigured" during migration.
  const hasPublicBucket = Boolean(env.R2_PUBLIC_BUCKET_NAME)
  const publicAdapter: 'r2' | 'unconfigured' = hasPublicBucket && missing.length === 0
    ? 'r2'
    : 'unconfigured'
  const publicReason = hasPublicBucket
    ? missing.length === 0
      ? 'R2_PUBLIC_BUCKET_NAME set + shared R2 creds present.'
      : 'R2_PUBLIC_BUCKET_NAME set but private R2 creds incomplete — public adapter cannot load.'
    : 'R2_PUBLIC_BUCKET_NAME unset — public-context uploads/reads fall back to the private adapter.'

  if (missing.length === 0) {
    return {
      kind: 'r2',
      reason: 'R2 env vars present',
      publicAdapter,
      publicReason,
    }
  }
  if (
    env.NODE_ENV === 'production' &&
    env.VERCEL_ENV === 'production' &&
    env.ALLOW_MOCK_STORAGE_IN_PRODUCTION !== 'true'
  ) {
    return {
      kind: 'throw',
      reason:
        'Mock storage adapter cannot run on a production deploy without ' +
        'ALLOW_MOCK_STORAGE_IN_PRODUCTION=true. Set the R2 env vars to use ' +
        'Cloudflare R2.',
      missingEnvVars: missing,
      publicAdapter,
      publicReason,
    }
  }
  if (env.NODE_ENV !== 'production') {
    return {
      kind: 'mock',
      reason:
        'Dev / non-production environment with no R2 env vars — falling back to mock adapter.',
      publicAdapter,
      publicReason,
    }
  }
  // NODE_ENV === 'production' but VERCEL_ENV !== 'production' (preview) — or
  // the explicit escape hatch is enabled. Mock is permitted.
  return {
    kind: 'mock',
    reason:
      env.ALLOW_MOCK_STORAGE_IN_PRODUCTION === 'true'
        ? 'ALLOW_MOCK_STORAGE_IN_PRODUCTION=true — mock explicitly opted in.'
        : 'Production node environment outside a true production Vercel deploy (preview) — mock allowed.',
    publicAdapter,
    publicReason,
  }
}

export function diagnoseStorageAdapter(
  env: Record<string, string | undefined> = process.env,
): AdapterDiagnosis {
  const decision = decideStorageAdapter(env)
  if (decision.kind === 'r2') {
    return {
      adapter: 'r2',
      reason: decision.reason,
      publicAdapter: decision.publicAdapter,
      publicReason: decision.publicReason,
    }
  }
  // For mock (whether by dev-fallback or production escape-hatch) and the
  // would-throw branch, surface the missing R2 vars so a future admin
  // diagnostic surface can show "you're on mock because X is missing."
  const missingEnvVars = R2_ENV_VARS.filter((name) => !env[name])
  if (decision.kind === 'mock') {
    return {
      adapter: 'mock',
      reason: decision.reason,
      ...(missingEnvVars.length > 0 ? { missingEnvVars } : {}),
      publicAdapter: decision.publicAdapter,
      publicReason: decision.publicReason,
    }
  }
  // For the "throw" decision, diagnose reports it as mock with the missing
  // vars listed — the caller (smoke harness, admin diagnostic) gets to see
  // why without crashing.
  return {
    adapter: 'mock',
    reason: decision.reason,
    missingEnvVars: decision.missingEnvVars,
    publicAdapter: decision.publicAdapter,
    publicReason: decision.publicReason,
  }
}

function selectAdapter(): {
  primary: StorageAdapter
  publicAdapter: StorageAdapter | null
} {
  const decision = decideStorageAdapter(process.env)
  if (decision.kind === 'r2') {
    // Lazy require so the r2-adapter module's own load-time env check only
    // runs when we're actually going to use it. A static top-level import
    // would crash dev (no R2 env vars) at boot.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./adapters/r2-adapter') as typeof import('./adapters/r2-adapter')
    return {
      primary: mod.r2Adapter,
      publicAdapter: mod.r2PublicAdapter ?? null,
    }
  }
  if (decision.kind === 'throw') {
    throw new Error(
      `[lib/storage] ${decision.reason} Missing env vars: ${decision.missingEnvVars.join(', ')}.`,
    )
  }
  // Mock branch — no public adapter in dev. Public-context reads still
  // resolve through the mock's getSignedUrl in the resolver fallback path.
  return { primary: mockAdapter, publicAdapter: null }
}

const adapters = selectAdapter()

/**
 * Default storage adapter — the PRIVATE bucket in Phase F3 (or the mock
 * adapter in dev). Every caller that needs to sign a URL for paid content
 * goes through this export.
 */
export const storage: StorageAdapter = adapters.primary

/**
 * Phase F3 — optional public-bucket adapter. Non-null only when
 * R2_PUBLIC_BUCKET_NAME is set in env. Callers MUST handle the null case
 * (fall back to `storage` / signed delivery) so the system stays functional
 * during the single-bucket → split migration.
 */
export const storagePublic: StorageAdapter | null = adapters.publicAdapter

export type {
  StorageAdapter,
  GetSignedUrlInput,
  SignedUrlResult,
  StorageProductType,
  UploadInput,
  UploadResult,
  PresignedPutInput,
  PresignedPutResult,
  ListedObject,
} from './types'

export { StorageError } from './types'
