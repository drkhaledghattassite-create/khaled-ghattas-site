import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { getBookingOrderByStripeSessionId } from '@/lib/db/queries'
import { getServerSession } from '@/lib/auth/server'
import { PendingPoller } from './PendingPoller'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'booking.success' })
  return {
    title: t('heading'),
    description: t('body'),
    robots: { index: false, follow: false },
  }
}

export default async function BookingSuccessPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'booking.success' })
  const sp = await searchParams
  const sessionId = typeof sp.session_id === 'string' ? sp.session_id : null
  const isRtl = locale === 'ar'

  // Auth + ownership gate. Anonymous visitors and signed-in users probing a
  // session_id that isn't theirs see the same generic "pending" state — we
  // never confirm or deny the existence of an order to a non-owner. Mirrors
  // the API poller at app/api/booking/order-status/route.ts:38-46 so the
  // server-rendered shell and the live poll agree.
  const session = await getServerSession().catch(() => null)
  const rawOrder =
    session && sessionId
      ? await getBookingOrderByStripeSessionId(sessionId).catch(() => null)
      : null
  const order =
    rawOrder && rawOrder.userId && rawOrder.userId === session?.user.id
      ? rawOrder
      : null

  const isPaid = order?.status === 'PAID'
  // Pending state covers: known-pending order, OR session_id present without
  // a confirmed match (could be unauth, mid-webhook, or cross-user probe —
  // all collapse to the same generic message).
  const isPending = order?.status === 'PENDING' || (sessionId && !order)

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      className="border-b border-[var(--color-border)] [padding:clamp(72px,10vw,128px)_clamp(20px,5vw,56px)]"
    >
      <div className="mx-auto max-w-[640px] text-center">
        <div className="flex flex-col items-center gap-5">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              isPaid
                ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                : 'bg-[var(--color-bg-deep)] text-[var(--color-fg3)]'
            }`}
          >
            {isPaid ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            )}
          </div>

          <h1
            className={`m-0 text-[clamp(28px,3.5vw,40px)] font-extrabold leading-[1.15] tracking-[-0.015em] text-[var(--color-fg1)] [text-wrap:balance] ${
              isRtl
                ? 'font-arabic-display'
                : 'font-arabic-display !tracking-[-0.025em]'
            }`}
          >
            {isPaid ? t('heading') : t('pending_heading')}
          </h1>

          <p
            className={`m-0 max-w-[480px] text-[16px] leading-[1.65] text-[var(--color-fg2)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {isPaid ? t('body') : t('pending_body')}
          </p>

          {isPaid && order && (
            <span
              className={`inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-[12px] font-semibold tracking-[0.08em] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {t('order_ref_label')} ·{' '}
              <span className="text-[var(--color-fg2)]">
                {order.id.slice(0, 8).toUpperCase()}
              </span>
            </span>
          )}

          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {isPaid ? (
              <>
                <Link
                  href="/dashboard"
                  className={`btn-pill btn-pill-primary ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('go_to_dashboard')}
                </Link>
                <Link
                  href="/booking/tours"
                  className={`btn-pill btn-pill-secondary ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('browse_more')}
                </Link>
              </>
            ) : (
              <Link
                href="/booking/tours"
                className={`btn-pill btn-pill-secondary ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('browse_more')}
              </Link>
            )}
          </div>
        </div>

        {isPending && sessionId && <PendingPoller sessionId={sessionId} />}
      </div>
    </section>
  )
}
