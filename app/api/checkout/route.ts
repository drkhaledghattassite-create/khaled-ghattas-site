import { NextResponse } from 'next/server'
import { z } from 'zod'
import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { getBookById } from '@/lib/db/queries'
import { getServerSession } from '@/lib/auth/server'
import { apiError, errInternal, errNotFound, parseJsonBody } from '@/lib/api/errors'
import { assertSameOrigin } from '@/lib/api/origin'
import { SITE_URL } from '@/lib/constants'

const checkoutSchema = z.object({
  bookId: z.string().min(1).max(64),
})

export async function POST(req: Request) {
  const originErr = assertSameOrigin(req)
  if (originErr) return originErr

  const body = await parseJsonBody(req, checkoutSchema)
  if (!body.ok) return body.response

  const stripe = getStripe()
  if (!stripe) {
    return apiError('INTERNAL', 'Checkout is not configured yet.', { status: 503 })
  }

  const book = await getBookById(body.data.bookId)
  if (!book) return errNotFound('Book not found.')

  const session = await getServerSession()
  const customerEmail = session?.user.email

  // Build absolute return URLs from request origin so the flow works in dev too.
  const reqHeaders = await headers()
  const host = reqHeaders.get('host')
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https'
  const origin = host ? `${proto}://${host}` : SITE_URL

  const priceCents = Math.round(Number(book.price) * 100)
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    return apiError('VALIDATION', 'Book price is invalid.', { status: 400 })
  }

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
              images: book.coverImage ? [book.coverImage] : undefined,
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
        userId: session?.user.id ?? '',
      },
    })

    if (!checkoutSession.url) {
      return errInternal('Stripe did not return a checkout URL.')
    }

    return NextResponse.json({ ok: true, url: checkoutSession.url })
  } catch (err) {
    console.error('[api/checkout] stripe error', err)
    return errInternal('Could not create checkout session.')
  }
}
