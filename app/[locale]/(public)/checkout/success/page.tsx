import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import {
  getOrderByStripeSessionId,
  getOrderItemsWithBooks,
} from '@/lib/db/queries'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'checkout.success' })
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  }
}

/**
 * Phase 5.2 — resolve the just-purchased item's reader/viewer route.
 *
 * Stripe sets `?session_id={CHECKOUT_SESSION_ID}` on the success URL (see
 * app/api/checkout/route.ts). The webhook persists the order with that
 * id; this function reads the order back, picks a deterministic first
 * item, and returns its in-app reader/viewer href so the "Start now"
 * CTA can deep-link straight into the content.
 *
 * Pick rule when an order has multiple items:
 *   1. Books before sessions (BOOK < SESSION lexicographically — but we
 *      pin BOOK first explicitly, since BOOK readers are typically
 *      faster to engage with than a 60-min lecture).
 *   2. Alphabetical by book slug, ascending. Slug is stable, locale-
 *      independent, and human-readable in URLs.
 *
 * Returns null when:
 *   - The session_id is missing, empty, or non-string (defensive).
 *   - No order is found (webhook race — user hit success before the
 *     webhook persisted).
 *   - The order has zero items (data integrity issue; loud-log).
 * The caller falls back to the generic "Go to library" CTA in those
 * cases.
 */
async function resolveStartNowHref(
  raw: string | string[] | undefined,
): Promise<string | null> {
  if (typeof raw !== 'string' || raw.length === 0) return null
  const order = await getOrderByStripeSessionId(raw)
  if (!order) {
    console.info('[checkout/success] no order for session_id', { raw })
    return null
  }
  const items = await getOrderItemsWithBooks(order.id)
  if (items.length === 0) {
    console.warn('[checkout/success] order has zero items', { orderId: order.id })
    return null
  }
  // Stable sort: BOOK first (productType ASC: 'BOOK' < 'SESSION'), then
  // by slug ASC. Spread to a fresh array because Drizzle's result is
  // technically frozen in Strict mode.
  const sorted = [...items].sort((a, b) => {
    if (a.book.productType !== b.book.productType) {
      return a.book.productType < b.book.productType ? -1 : 1
    }
    return a.book.slug < b.book.slug ? -1 : a.book.slug > b.book.slug ? 1 : 0
  })
  const first = sorted[0]!
  return first.book.productType === 'SESSION'
    ? `/dashboard/library/session/${first.book.id}`
    : `/dashboard/library/read/${first.book.id}`
}

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('checkout.success')
  const tStart = await getTranslations('checkout_success')
  const isRtl = locale === 'ar'

  const sp = await searchParams
  const startNowHref = await resolveStartNowHref(sp.session_id)

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-[60vh] [padding:clamp(80px,10vw,140px)_clamp(20px,5vw,56px)] flex items-center justify-center"
    >
      <div className="mx-auto max-w-[640px] text-center flex flex-col gap-6">
        <span className="section-eyebrow self-center">{t('eyebrow')}</span>
        <h1
          className={`m-0 text-[clamp(32px,4vw,52px)] leading-[1.1] font-bold tracking-[-0.02em] text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display'
          }`}
        >
          {t('heading')}
        </h1>
        <p
          className={`m-0 text-[16px] leading-[1.6] text-[var(--color-fg2)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('description')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          {startNowHref ? (
            // Phase 5.2 — when we can resolve the just-purchased item we
            // emit a primary "Start now" deep link to its reader/viewer
            // and demote the existing library link to secondary. The
            // user came here to consume; the lowest-friction path is to
            // jump straight into the content.
            <>
              <Link
                href={startNowHref}
                className="btn-pill btn-pill-primary"
              >
                {tStart('start_now_cta')}
              </Link>
              <Link
                href="/dashboard/library"
                className="btn-pill btn-pill-secondary"
              >
                {tStart('go_to_library_cta')}
              </Link>
            </>
          ) : (
            // Defensive fallback — no resolvable order means we can't
            // construct a deep link, so the layout reverts to the
            // pre-Phase-5.2 two-CTA shape (library primary, browse-more
            // secondary).
            <>
              <Link href="/dashboard/library" className="btn-pill btn-pill-primary">
                {t('open_library')}
              </Link>
              <Link href="/books" className="btn-pill btn-pill-secondary">
                {t('browse_more')}
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
