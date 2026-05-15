/**
 * Cloudflare R2 storage adapter — Phase F1.
 *
 * R2 speaks the S3 API; we drive it with the AWS SDK v3 client pointed at
 * R2's S3-compatible endpoint. All public delivery uses signed URLs — the
 * bucket itself has public access disabled.
 *
 * Module-load guard: this module THROWS at import time if any of the four
 * required env vars are missing. To keep dev (no R2 credentials) booting,
 * `lib/storage/index.ts` only imports this module when the env vars are
 * present — see the dynamic `require` there.
 *
 * Convention notes:
 *   - `getSignedUrl({ storageKey, expiresInSeconds })` is the EXISTING
 *     interface — same field names, same return shape. Don't rename it.
 *   - The four admin-side primitives (`upload`, `getPresignedPutUrl`,
 *     `delete`, `exists`, `list`) take a plain `key` and a `ttlSeconds`
 *     (presigned PUT only) since the admin doesn't know which row will own
 *     the key when they upload.
 *   - Every error is wrapped in `StorageError` with the original SDK error
 *     preserved on `.cause` so route handlers can log the real cause while
 *     presenting a stable shape to the client.
 *   - Signed-URL generation is logged at INFO so an ops sweep can audit who
 *     touched what. Don't include the signed URL in the log — it's a bearer
 *     credential for the next hour.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner'
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
} from '../types'

const ENV_VARS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
] as const

function readEnv(): {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
} {
  const missing = ENV_VARS.filter((name) => !process.env[name])
  if (missing.length > 0) {
    throw new StorageError(
      'CONFIG_MISSING',
      `Cloudflare R2 adapter requires the following env vars: ${missing.join(', ')}. ` +
        'Set them in your environment or remove this module from the selection in lib/storage/index.ts.',
    )
  }
  return {
    accountId: process.env.R2_ACCOUNT_ID!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucket: process.env.R2_BUCKET_NAME!,
  }
}

// Reading env at module load is the contract per the spec: "Add a top-of-file
// guard: if any of the 4 required env vars are unset AT MODULE LOAD time,
// throw immediately — fail loudly."
const { accountId, accessKeyId, secretAccessKey, bucket } = readEnv()

const endpoint = `https://${accountId}.r2.cloudflarestorage.com`

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: false,
})

const DEFAULT_GET_TTL_SECONDS = 60 * 60 // 1 hour
const DEFAULT_PUT_TTL_SECONDS = 15 * 60 // 15 minutes — admin upload window

function wrap<T>(method: string, op: () => Promise<T>): Promise<T> {
  return op().catch((err: unknown) => {
    // Preserve provider error on `cause` so the route handler can log the
    // full detail while returning the stable code to the client.
    const original = err instanceof Error ? err : new Error(String(err))
    throw new StorageError(
      'PROVIDER_ERROR',
      `R2 ${method} failed: ${original.message}`,
      { cause: original },
    )
  })
}

export const r2Adapter: StorageAdapter = {
  async getSignedUrl(input: GetSignedUrlInput): Promise<SignedUrlResult> {
    const ttl = input.expiresInSeconds ?? DEFAULT_GET_TTL_SECONDS
    const cmd = new GetObjectCommand({
      Bucket: bucket,
      Key: input.storageKey,
    })
    const url = await wrap('getSignedUrl', () =>
      awsGetSignedUrl(s3, cmd, { expiresIn: ttl }),
    )
    const expiresAt = new Date(Date.now() + ttl * 1000)
    console.info('[storage/r2] signed GET', {
      userId: input.userId,
      productType: input.productType,
      productId: input.productId,
      storageKey: input.storageKey,
      ttlSeconds: ttl,
    })
    return { url, expiresAt }
  },

  async upload(input: UploadInput): Promise<UploadResult> {
    await wrap('upload', () =>
      s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: input.key,
          Body: input.body as Buffer | Uint8Array | string,
          ContentType: input.contentType,
        }),
      ),
    )
    const size =
      typeof input.body === 'string'
        ? Buffer.byteLength(input.body)
        : input.body instanceof Uint8Array
          ? input.body.byteLength
          : null
    return {
      key: input.key,
      size,
      contentType: input.contentType,
      uploadedAt: new Date(),
    }
  },

  async getPresignedPutUrl(input: PresignedPutInput): Promise<PresignedPutResult> {
    const ttl = input.ttlSeconds ?? DEFAULT_PUT_TTL_SECONDS
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      ContentType: input.contentType,
      // ContentLength is set so the signed URL refuses larger bodies. R2
      // includes the value in the signature; the browser must send the same
      // Content-Length header (which it does automatically for File bodies).
      ...(input.maxSizeBytes ? { ContentLength: input.maxSizeBytes } : {}),
    })
    const url = await wrap('getPresignedPutUrl', () =>
      awsGetSignedUrl(s3, cmd, {
        expiresIn: ttl,
        // The ContentType + ContentLength headers must be signed AND echoed
        // back by the client PUT. The presigner does that automatically when
        // we set them on the command above.
      }),
    )
    const expiresAt = new Date(Date.now() + ttl * 1000)
    console.info('[storage/r2] signed PUT', {
      key: input.key,
      contentType: input.contentType,
      ttlSeconds: ttl,
      maxSizeBytes: input.maxSizeBytes ?? null,
    })
    return { url, key: input.key, expiresAt }
  },

  async delete(key: string): Promise<void> {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    } catch (err: unknown) {
      // DeleteObject on a missing key returns 204 in S3/R2, so this catch
      // only fires on transport / auth / serialization errors. Soft-fail is
      // intentional per spec — "Soft-fail on missing."
      const original = err instanceof Error ? err : new Error(String(err))
      // Be conservative: only swallow NoSuchKey; rethrow everything else.
      const name = (original as { name?: string }).name
      if (name === 'NoSuchKey' || name === 'NotFound') return
      throw new StorageError(
        'PROVIDER_ERROR',
        `R2 delete failed: ${original.message}`,
        { cause: original },
      )
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      return true
    } catch (err: unknown) {
      const original = err instanceof Error ? err : new Error(String(err))
      const name = (original as { name?: string }).name
      const statusCode = (original as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode
      if (name === 'NotFound' || name === 'NoSuchKey' || statusCode === 404) {
        return false
      }
      throw new StorageError(
        'PROVIDER_ERROR',
        `R2 exists failed: ${original.message}`,
        { cause: original },
      )
    }
  },

  async list(prefix?: string): Promise<ListedObject[]> {
    const out = await wrap('list', () =>
      s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          ...(prefix ? { Prefix: prefix } : {}),
        }),
      ),
    )
    const contents = out.Contents ?? []
    return contents
      .filter((o) => typeof o.Key === 'string')
      .map((o) => ({
        key: o.Key!,
        size: o.Size ?? 0,
        lastModified: o.LastModified ?? new Date(0),
      }))
  },
}
