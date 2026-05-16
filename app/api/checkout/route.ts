import { NextResponse } from 'next/server'
import { z } from 'zod'
import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { getBookById } from '@/lib/db/queries'
import { getServerSession } from '@/lib/auth/server'
import { apiError, errInternal, errNotFound, errUnauthorized, parseJsonBody } from '@/lib/api/errors'
import { assertSameOrigin } from '@/lib/api/origin'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import { SITE_URL } from '@/lib/constants'
import { resolveStripeImageUrl } from '@/lib/stripe/images'

const checkoutSchema = z.object({
  bookId: z.string().min(1).max(64),
  // Buyer's current site locale, forwarded into the Stripe Checkout
  // metadata so the post-purchase email can render in the same language
  // the user just paid in. The webhook reads it back as
  // `session.metadata.locale`. Permissive on input — any unrecognised
  // value is normalised to the site default at use-site rather than
  // blocking the entire checkout (an unexpected locale string is not a
  // reason to refuse a payment). Cap length to keep the metadata field
  // bounded — Stripe metadata values max at 500 chars but we don't need
  // anywhere near that.
  locale: z.string().max(8).optional(),
})

const SUPPORTED_EMAIL_LOCALES = ['ar', 'en'] as const
type EmailLocale = (typeof SUPPORTED_EMAIL_LOCALES)[number]

function normaliseEmailLocale(raw: string | undefined): EmailLocale {
  return SUPPORTED_EMAIL_LOCALES.includes(raw as EmailLocale)
    ? (raw as EmailLocale)
    : 'ar'
}

export async function POST(req: Request) {
  const originErr = assertSameOrigin(req)
  if (originErr) return originErr

  // Require an authenticated session before doing any work — orders need to
  // be linked to a user account so they show up in the buyer's dashboard.
  const session = await getServerSession()
  if (!session) return errUnauthorized('Sign in to complete your purchase.')

  // QA P2 — per-user rate limit. Without this, a logged-in attacker could
  // rapid-fire checkout-session creations, racking up Stripe API usage
  // (each call hits Stripe's API) and creating throwaway sessions that
  // pollute admin reports. 10/min is generous for any legitimate flow
  // (a user opening Stripe, cancelling, retrying a few times) but blocks
  // scripted abuse. Fails open without Upstash (per lib/redis/ratelimit.ts).
  const rl = await tryRateLimit(`checkout:${session.user.id}`)
  if (!rl.ok) {
    return apiError('RATE_LIMITED', 'Too many checkout attempts.', { status: 429 })
  }

  const body = await parseJsonBody(req, checkoutSchema)
  if (!body.ok) return body.response

  const stripe = getStripe()
  if (!stripe) {
    return apiError('INTERNAL', 'Checkout is not configured yet.', { status: 503 })
  }

  const book = await getBookById(body.data.bookId)
  if (!book) return errNotFound('Book not found.')

  // SECURITY [H-B2]: gate purchase on publish state + a real price. Same
  // 404 shape as a missing book so admin/draft enumeration cannot
  // distinguish "doesn't exist" from "exists but not for sale."
  // `getBookById` itself does NOT filter on status (it's used by admin
  // edit screens) so the route layer must enforce it. Gift creation
  // already does the equivalent check in `resolveGiftItemPrice`
  // (lib/db/queries.ts) — checkout was the last unguarded entry point.
  if (book.status !== 'PUBLISHED') return errNotFound('Book not found.')
  if (!book.price || Number(book.price) <= 0) {
    return apiError(
      'VALIDATION',
      'This book is not available for purchase.',
      { status: 400 },
    )
  }

  const customerEmail = session.user.email

  // SECURITY [H-4]: Stripe success/cancel URLs MUST be derived from a trusted
  // source. Previously this used the `Host` header to build the origin, which
  // is attacker-controlled (Host header injection) — an attacker who could
  // influence the upstream proxy could redirect successful buyers to an
  // attacker-controlled domain.
  // In production: always use SITE_URL (= NEXT_PUBLIC_APP_URL), which is
  // baked into the deployment env.
  // In dev: fall back to the request-derived origin so localhost / .local /
  // 127.0.0.1 workflows keep working, but reject any other host so a
  // mistakenly-deployed dev build can't be exploited the same way.
  let origin: string
  if (process.env.NODE_ENV === 'production') {
    origin = SITE_URL
  } else {
    const reqHeaders = await headers()
    const host = reqHeaders.get('host') ?? ''
    const proto = reqHeaders.get('x-forwarded-proto') ?? 'http'
    const isDevHost =
      /^localhost(:\d+)?$/i.test(host) ||
      /^127\.0\.0\.1(:\d+)?$/.test(host) ||
      /\.local(:\d+)?$/i.test(host)
    if (host && isDevHost) {
      origin = `${proto}://${host}`
    } else {
      origin = SITE_URL
    }
  }

  const priceCents = Math.round(Number(book.price) * 100)
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    return apiError('VALIDATION', 'Book price is invalid.', { status: 400 })
  }

  // Stripe fetches images server-side, so they must be publicly reachable
  // absolute URLs. `resolveStripeImageUrl` runs the value through
  // `resolvePublicUrl` first (handles R2 keys + http URLs + /-prefixed
  // local assets), then validates absolute http(s). Returns null on
  // anything Stripe can't fetch.
  const imageUrl = await resolveStripeImageUrl(book.coverImage)
  const productImages = imageUrl ? [imageUrl] : undefined

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: (book.currency || 'usd').toLowerCase(),
            product_data: {
              name: book.titleEn || book.titleAr,
              description: book.descriptionEn ?? book.descriptionAr ?? undefined,
              images: productImages,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/books/${book.slug}`,
      metadata: {
        bookId: book.id,
        bookSlug: book.slug,
        userId: session.user.id,
        locale: normaliseEmailLocale(body.data.locale),
      },
    })

    if (!checkoutSession.url) {
      return errInternal('Stripe did not return a checkout URL.')
    }

    return NextResponse.json({ ok: true, url: checkoutSession.url })
  } catch (err) {
    console.error('[api/checkout] stripe error', err)
    const detail =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : 'Unknown error.'
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Could not create checkout session.'
        : `Could not create checkout session: ${detail}`
    return errInternal(message)
  }
}

