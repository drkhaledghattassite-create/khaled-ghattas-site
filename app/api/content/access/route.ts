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
import { storage } from '@/lib/storage'

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

  const rl = await tryRateLimit(`content-access:${userId}`)
  if (!rl.ok) {
    const res = apiError('RATE_LIMITED', 'Too many requests.')
    for (const [k, v] of Object.entries(rl.headers)) res.headers.set(k, v)
    return res
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

      const signed = await storage.getSignedUrl({
        productType: 'BOOK',
        productId: book.id,
        storageKey,
        userId,
      })
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

    const signed = await storage.getSignedUrl({
      productType: 'SESSION_ITEM',
      productId: item.id,
      storageKey: item.storageKey,
      userId,
    })
    return NextResponse.json({
      url: signed.url,
      expiresAt: signed.expiresAt.toISOString(),
    })
  } catch (err) {
    console.error('[api/content/access]', err)
    return errInternal('Could not prepare your download.')
  }
}
