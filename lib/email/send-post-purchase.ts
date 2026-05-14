/**
 * Post-purchase email — shared between the Stripe webhook (first delivery)
 * and the admin "Resend receipt" action (re-delivery from /admin/orders/[id]).
 *
 * The function reads back the order's items joined with their books so we
 * can correctly branch BOOK vs SESSION in the template (sessions don't get
 * a download link, just a library URL). For each BOOK with a `digitalFile`
 * we mint a 7-day signed URL via the storage adapter. Sessions and books-
 * without-digital-file get a null download URL — the template falls back
 * to the library link.
 *
 * Empty-items edge case: the email STILL sends — the template renders an
 * apology block instead of the delivery sections. This matches the spec:
 * the order is recorded, the customer was charged, they should receive
 * acknowledgement with a path to support.
 *
 * Errors are caught by the caller; this fn is allowed to throw on
 * unexpected DB failures, but the email-send result (`ok: false` with a
 * structured reason) flows back via the return type.
 */

import { sendEmail } from '@/lib/email/send'
import {
  buildPostPurchaseHtml,
  buildPostPurchaseSubject,
  buildPostPurchaseText,
  type PostPurchaseBookEntry,
  type PostPurchaseLocale,
  type PostPurchaseSessionEntry,
} from '@/lib/email/templates/post-purchase'
import { getOrderItemsWithBooks } from '@/lib/db/queries'
import { storage } from '@/lib/storage'
import { SITE_URL } from '@/lib/constants'

export const POST_PURCHASE_LINK_EXPIRY_DAYS = 7
const POST_PURCHASE_LINK_EXPIRY_SECONDS =
  POST_PURCHASE_LINK_EXPIRY_DAYS * 24 * 60 * 60

// Public support inbox shown in the email footer. Override via env so we can
// route post-purchase replies to a different inbox than the corporate one if
// needed; default mirrors the team address used elsewhere on the site.
const DEFAULT_SUPPORT_EMAIL = 'Team@drkhaledghattass.com'

export function pickPublicImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  let parsed: URL
  try {
    parsed = trimmed.startsWith('/')
      ? new URL(trimmed, SITE_URL)
      : new URL(trimmed)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  const host = parsed.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
    return null
  }
  return parsed.toString()
}

export type SendPostPurchaseResult =
  | { ok: true; id: string | null }
  | {
      ok: false
      reason:
        | 'no-api-key'
        | 'send-failed'
        | 'preview-only'
        | 'invalid-recipient'
        | 'enqueue-failed'
    }

export async function sendPostPurchaseEmail(args: {
  orderId: string
  customerEmail: string
  customerName: string | null
  userId: string | null
  totalAmount: string
  currency: string
  locale: PostPurchaseLocale
}): Promise<SendPostPurchaseResult> {
  const items = await getOrderItemsWithBooks(args.orderId)
  if (items.length === 0) {
    // Loud log — this isn't supposed to happen — but the apology email
    // still goes out. The customer was charged; silence is worse than a
    // generic acknowledgement.
    console.error(
      '[email/sendPostPurchase] order has zero items — sending apology email',
      { orderId: args.orderId },
    )
  }

  // userId is required by the storage adapter signature even though the mock
  // doesn't use it. Fall back to the customer email when no account is linked
  // (guest checkout — not supported today, but we hedge against future
  // changes rather than silently passing an empty string).
  const ownerId = args.userId ?? `guest:${args.customerEmail}`

  const books: PostPurchaseBookEntry[] = []
  const sessions: PostPurchaseSessionEntry[] = []

  for (const { item, book } of items) {
    const coverImageUrl = pickPublicImageUrl(book.coverImage)
    if (book.productType === 'SESSION') {
      sessions.push({
        titleAr: book.titleAr,
        titleEn: book.titleEn,
        coverImageUrl,
        currency: book.currency || args.currency,
        priceAtPurchase: item.priceAtPurchase,
      })
      continue
    }
    let downloadUrl: string | null = null
    const storageKey = book.digitalFile?.trim()
    if (storageKey) {
      try {
        const signed = await storage.getSignedUrl({
          productType: 'BOOK',
          productId: book.id,
          storageKey,
          userId: ownerId,
          expiresInSeconds: POST_PURCHASE_LINK_EXPIRY_SECONDS,
        })
        downloadUrl = signed.url
      } catch (err) {
        // Per-book failure: render the "available shortly" note in the
        // template instead of breaking the whole email.
        console.error('[email/sendPostPurchase] storage.getSignedUrl failed for book', {
          orderId: args.orderId,
          bookId: book.id,
          err,
        })
      }
    }
    books.push({
      titleAr: book.titleAr,
      titleEn: book.titleEn,
      coverImageUrl,
      currency: book.currency || args.currency,
      priceAtPurchase: item.priceAtPurchase,
      downloadUrl,
    })
  }

  const supportEmail = process.env.SUPPORT_EMAIL ?? DEFAULT_SUPPORT_EMAIL

  const templateInput = {
    locale: args.locale,
    customerName: args.customerName,
    customerEmail: args.customerEmail,
    orderId: args.orderId,
    totalAmount: args.totalAmount,
    currency: args.currency,
    books,
    sessions,
    libraryUrl: `${SITE_URL}/dashboard/library`,
    signedUrlExpiresInDays: POST_PURCHASE_LINK_EXPIRY_DAYS,
    supportEmail,
  }

  const html = buildPostPurchaseHtml(templateInput)
  const text = buildPostPurchaseText(templateInput)

  return sendEmail({
    to: args.customerEmail,
    subject: buildPostPurchaseSubject(args.locale),
    html,
    text,
    previewLabel: 'post-purchase',
    emailType: 'post_purchase',
    relatedEntityType: 'order',
    relatedEntityId: args.orderId,
  })
}
