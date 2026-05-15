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
 * ─── Diagnostics ──────────────────────────────────────────────────────────
 * `diagnoseStorageAdapter()` returns `{ adapter, reason, missingEnvVars? }`
 * for the smoke harness and any future admin "what storage am I using"
 * surface. It runs the selection logic in pure form (no side effects, no
 * module-load throws) and reports the same decision.
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
  | { kind: 'r2'; reason: string }
  | { kind: 'mock'; reason: string }
  | { kind: 'throw'; reason: string; missingEnvVars: string[] } {
  const missing = R2_ENV_VARS.filter((name) => !env[name])
  if (missing.length === 0) {
    return { kind: 'r2', reason: 'R2 env vars present' }
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
    }
  }
  if (env.NODE_ENV !== 'production') {
    return {
      kind: 'mock',
      reason:
        'Dev / non-production environment with no R2 env vars — falling back to mock adapter.',
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
  }
}

export function diagnoseStorageAdapter(
  env: Record<string, string | undefined> = process.env,
): AdapterDiagnosis {
  const decision = decideStorageAdapter(env)
  if (decision.kind === 'r2') return { adapter: 'r2', reason: decision.reason }
  // For mock (whether by dev-fallback or production escape-hatch) and the
  // would-throw branch, surface the missing R2 vars so a future admin
  // diagnostic surface can show "you're on mock because X is missing."
  const missingEnvVars = R2_ENV_VARS.filter((name) => !env[name])
  if (decision.kind === 'mock') {
    return {
      adapter: 'mock',
      reason: decision.reason,
      ...(missingEnvVars.length > 0 ? { missingEnvVars } : {}),
    }
  }
  // For the "throw" decision, diagnose reports it as mock with the missing
  // vars listed — the caller (smoke harness, admin diagnostic) gets to see
  // why without crashing.
  return {
    adapter: 'mock',
    reason: decision.reason,
    missingEnvVars: decision.missingEnvVars,
  }
}

function selectAdapter(): StorageAdapter {
  const decision = decideStorageAdapter(process.env)
  if (decision.kind === 'r2') {
    // Lazy require so the r2-adapter module's own load-time env check only
    // runs when we're actually going to use it. A static top-level import
    // would crash dev (no R2 env vars) at boot.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./adapters/r2-adapter') as typeof import('./adapters/r2-adapter')
    return mod.r2Adapter
  }
  if (decision.kind === 'throw') {
    throw new Error(
      `[lib/storage] ${decision.reason} Missing env vars: ${decision.missingEnvVars.join(', ')}.`,
    )
  }
  return mockAdapter
}

export const storage: StorageAdapter = selectAdapter()

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
