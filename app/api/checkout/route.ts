import { NextResponse } from 'next/server'
import { z } from 'zod'
import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { getBookById } from '@/lib/db/queries'
import { getServerSession } from '@/lib/auth/server'
import { apiError, errInternal, errNotFound, errUnauthorized, parseJsonBody } from '@/lib/api/errors'
import { assertSameOrigin } from '@/lib/api/origin'
import { SITE_URL } from '@/lib/constants'

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

  const body = await parseJsonBody(req, checkoutSchema)
  if (!body.ok) return body.response

  const stripe = getStripe()
  if (!stripe) {
    return apiError('INTERNAL', 'Checkout is not configured yet.', { status: 503 })
  }

  const book = await getBookById(body.data.bookId)
  if (!book) return errNotFound('Book not found.')

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
  // absolute URLs. Skip local/relative paths (won't load from Stripe's edge)
  // and localhost (Stripe can't reach it from the public internet).
  const imageUrl = pickPublicImageUrl(book.coverImage)
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

function pickPublicImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  let parsed: URL
  try {
    parsed = new URL(trimmed)
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
