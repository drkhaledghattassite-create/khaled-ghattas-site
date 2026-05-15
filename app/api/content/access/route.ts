import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  apiError,
  errForbidden,
  errInternal,
  errNotFound,
  errUnauthorized,
  parseJsonBody,
} from '@/lib/api/errors'
import { assertSameOrigin } from '@/lib/api/origin'
import { getServerSession } from '@/lib/auth/server'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import {
  getBookById,
  getSessionItemById,
  userOwnsProduct,
} from '@/lib/db/queries'
import { storage, storagePublic } from '@/lib/storage'
import { bucketForKey } from '@/lib/validators/storage'

// Force per-request rendering — this is an authenticated, ownership-gated
// endpoint. Static caching would either leak content or 401 every request.
export const dynamic = 'force-dynamic'

const accessSchema = z.object({
  productType: z.enum(['BOOK', 'SESSION_ITEM']),
  productId: z.string().min(1).max(64),
})

/**
 * POST /api/content/access
 *
 * Returns a short-lived signed URL for an owned product. Ownership is
 * verified server-side via `userOwnsProduct` (book) or by walking from
 * `session_item → parent book → ownership` (session item). Books that 404
 * here are either not owned by the user (we return 403) or do not exist
 * (we return 404). We don't differentiate further because that information
 * leak would let unauthenticated probes enumerate the catalog.
 *
 * Rate-limited per-user (10 req/min) to prevent download-link harvesting.
 */
export async function POST(req: Request) {
  const originErr = assertSameOrigin(req)
  if (originErr) return originErr

  const session = await getServerSession()
  if (!session) return errUnauthorized('Sign in to access this content.')

  const body = await parseJsonBody(req, accessSchema)
  if (!body.ok) return body.response

  const userId = session.user.id

  // Layered rate limits — keep both as defense-in-depth (Phase F1):
  //   - content-access: 10/min — short-burst guard against link harvesting
  //   - content-signed: 60/hr — long-window cap so a slow drip can't
  //     enumerate the catalog under the short-burst ceiling
  // We fail-closed on either denying.
  const rlBurst = await tryRateLimit(`content-access:${userId}`)
  if (!rlBurst.ok) {
    const res = apiError('RATE_LIMITED', 'Too many requests.')
    for (const [k, v] of Object.entries(rlBurst.headers)) res.headers.set(k, v)
    return res
  }
  const rlHour = await tryRateLimit(`content-signed:${userId}`, {
    limit: 60,
    window: '60 m',
  })
  if (!rlHour.ok) {
    const res = apiError('RATE_LIMITED', 'Hourly signed-URL limit reached.')
    for (const [k, v] of Object.entries(rlHour.headers)) res.headers.set(k, v)
    return res
  }

  /**
   * Phase F1 storageKey discriminator.
   *
   * Convention: if a storageKey starts with `http://` or `https://` it's an
   * external URL (legacy data, vendor link, etc.) and we return it verbatim
   * with a synthetic 1h expiry. Otherwise it's an opaque R2 object key and
   * we mint a signed URL.
   *
   * Phase F2 — VIDEO session items now reach this route when their
   * storageKey points at an R2 object (anything that doesn't match the
   * YouTube id/URL shapes; see `pickVideoProvider` in lib/video/index.ts).
   * YouTube-shaped keys still bypass the route — the iframe embed handles
   * delivery directly.
   *
   * Phase F3 — bucket guard. Once the public bucket is configured
   * (`storagePublic !== null`), public-context keys (book-cover, gallery-
   * image, …) MUST NOT flow through this auth+ownership-gated route —
   * they're served unsigned by `resolvePublicUrl` directly. We return
   * `null` here to signal "not for this route"; the caller surfaces a 400.
   *
   * During the migration window (R2_PUBLIC_URL / R2_PUBLIC_BUCKET_NAME
   * still unset → `storagePublic === null`), public-context keys are
   * tolerated and signed via the private adapter — same behavior as F2.
   */
  function classifyStorageKey(storageKey: string): 'external' | 'public' | 'private' {
    if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
      return 'external'
    }
    // bucketForKey throws on unknown prefix. Catch defensively so a
    // malformed DB row produces a 4xx via the caller's null-check rather
    // than crashing the route. We default to 'private' on unknown prefix —
    // the signed-URL path will fail loudly if the object doesn't exist,
    // which is the safer fallback than accidentally classifying as public.
    try {
      return bucketForKey(storageKey)
    } catch {
      return 'private'
    }
  }

  function buildResult(args: {
    productType: 'BOOK' | 'SESSION_ITEM'
    productId: string
    storageKey: string
    expiresInSeconds?: number
  }): Promise<{ url: string; expiresAt: Date }> | null {
    const kind = classifyStorageKey(args.storageKey)
    if (kind === 'external') {
      const ttl = args.expiresInSeconds ?? 60 * 60
      const expiresAt = new Date(Date.now() + ttl * 1000)
      return Promise.resolve({ url: args.storageKey, expiresAt })
    }
    if (kind === 'public' && storagePublic !== null) {
      // Phase F3 — both buckets configured AND this is a public-context key.
      // The content-access route should never sign these; the resolver does
      // it unsigned. Signal "wrong route" via null.
      return null
    }
    return storage.getSignedUrl({
      productType: args.productType,
      productId: args.productId,
      storageKey: args.storageKey,
      userId,
      expiresInSeconds: args.expiresInSeconds,
    })
  }

  try {
    if (body.data.productType === 'BOOK') {
      const book = await getBookById(body.data.productId)
      if (!book) return errNotFound('Book not found.')

      const owns = await userOwnsProduct(userId, book.id)
      if (!owns) return errForbidden('You do not own this content.')

      // For BOOKs, the storage key is the digital_file column. If the book
      // has no digital file (external_url only), there's nothing to sign.
      const storageKey = book.digitalFile?.trim()
      if (!storageKey) {
        return errNotFound('No downloadable file is attached to this book.')
      }

      const signedPromise = buildResult({
        productType: 'BOOK',
        productId: book.id,
        storageKey,
      })
      if (signedPromise === null) {
        // Phase F3 — public-context key on a paid surface. This route is
        // for owned/private content only; covers are served via
        // resolvePublicUrl without auth. Surface as 400 so the bug is
        // visible (no client should ever post a public key here).
        console.warn('[api/content/access] public-bucket key rejected', {
          productType: 'BOOK',
          productId: book.id,
          storageKey,
        })
        return apiError(
          'VALIDATION',
          'This content is served publicly and cannot be requested through the protected access route.',
        )
      }
      const signed = await signedPromise
      return NextResponse.json({
        url: signed.url,
        expiresAt: signed.expiresAt.toISOString(),
      })
    }

    // SESSION_ITEM branch.
    const item = await getSessionItemById(body.data.productId)
    if (!item) return errNotFound('Session item not found.')

    // QA P2 — productType assertion at the access layer. `session_items.session_id`
    // points at `books.id` without a FK CHECK enforcing that the parent has
    // productType='SESSION' (app-level invariant per CLAUDE.md). If a bug ever
    // misroutes a non-SESSION book id through here, ownership would resolve
    // against a different commerce surface. Defensive check.
    const parentBook = await getBookById(item.sessionId)
    if (!parentBook || parentBook.productType !== 'SESSION') {
      console.warn('[api/content/access] SESSION_ITEM parent invariant violated', {
        sessionItemId: item.id,
        parentBookId: item.sessionId,
        parentProductType: parentBook?.productType ?? 'missing',
      })
      return errNotFound('Session item not found.')
    }

    // Walk to the parent session (a books row) and check ownership.
    const owns = await userOwnsProduct(userId, item.sessionId)
    if (!owns) return errForbidden('You do not own this content.')

    const signedPromise = buildResult({
      productType: 'SESSION_ITEM',
      productId: item.id,
      storageKey: item.storageKey,
    })
    if (signedPromise === null) {
      console.warn('[api/content/access] public-bucket key rejected', {
        productType: 'SESSION_ITEM',
        productId: item.id,
        storageKey: item.storageKey,
      })
      return apiError(
        'VALIDATION',
        'This content is served publicly and cannot be requested through the protected access route.',
      )
    }
    const signed = await signedPromise
    return NextResponse.json({
      url: signed.url,
      expiresAt: signed.expiresAt.toISOString(),
    })
  } catch (err) {
    console.error('[api/content/access]', err)
    return errInternal('Could not prepare your download.')
  }
}
