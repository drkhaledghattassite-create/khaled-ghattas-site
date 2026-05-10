import { notFound } from 'next/navigation'
import { ChevronLeft, Gift } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { BookingOrderRefundButton } from '@/components/admin/BookingOrderRefundButton'
import { getBookingOrderById } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function AdminBookingOrderDetailPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const order = await getBookingOrderById(id)
  if (!order) notFound()

  const t = await getTranslations('admin.booking_orders')
  const isAr = locale === 'ar'

  // Currency-aware formatter (defaults to USD if blank).
  const priceFmt = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: order.currency || 'USD',
  })
  const dateFmt = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const refundable =
    order.status === 'PAID' && order.stripePaymentIntentId !== null

  const bookingTitle = isAr ? order.bookingTitleAr : order.bookingTitleEn
  const productTypeLabel = order.bookingProductType
    ? order.bookingProductType === 'RECONSIDER_COURSE'
      ? t('type_reconsider')
      : t('type_session')
    : null

  return (
    <div className="space-y-6">
      <Link
        href="/admin/booking/orders"
        className="font-label inline-flex items-center gap-1 text-[12px] text-fg3 hover:text-fg1"
      >
        <ChevronLeft className="h-3 w-3 rtl:rotate-180" aria-hidden />
        {t('back_to_list')}
      </Link>

      {/* Phase D — gift-claim badge. When set, this booking_order originated
          from a gift (USER_PURCHASE via Stripe or ADMIN_GRANT). Refunding it
          cascades through markGiftRefunded; the refund modal warns admin. */}
      {order.giftId && (
        <Link
          href={`/admin/gifts/${order.giftId}`}
          className="inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent-soft/60 px-3 py-2 text-[12px] font-display font-semibold text-accent transition-colors hover:border-accent hover:bg-accent-soft"
        >
          <Gift className="h-3.5 w-3.5" aria-hidden />
          {t('gift_claim_badge')}
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: order facts */}
        <section className="space-y-5 rounded-md border border-dashed border-border bg-bg-elevated p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-label text-[10px] text-fg3">
                {t('section_order')}
              </p>
              <p className="m-0 inline-flex items-center gap-2 text-[15px] font-semibold font-display text-fg1">
                <span className="rounded bg-bg-deep px-2 py-0.5 font-mono text-[12px] text-fg2 num-latn">
                  {order.id.slice(0, 8)}…{order.id.slice(-4)}
                </span>
              </p>
            </div>
            <StatusBadge status={order.status} />
          </header>

          <dl className="grid grid-cols-2 gap-4 border-t border-dashed border-border pt-4 text-[13px]">
            <div className="col-span-2">
              <dt className="font-label text-[10px] text-fg3">
                {t('field_order_id')}
              </dt>
              <dd
                className="mt-1 break-all font-mono text-[12px] text-fg2 num-latn"
                title={order.id}
              >
                {order.id}
              </dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">
                {t('field_amount')}
              </dt>
              <dd className="text-fg1 font-display font-semibold num-latn">
                {priceFmt.format(order.amountPaid / 100)}
              </dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">
                {t('field_currency')}
              </dt>
              <dd className="text-fg1 font-display num-latn">
                {order.currency || 'USD'}
              </dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">
                {t('field_created')}
              </dt>
              <dd className="text-fg1">{dateFmt.format(order.createdAt)}</dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">
                {t('field_confirmed')}
              </dt>
              <dd className="text-fg1">
                {order.confirmedAt
                  ? dateFmt.format(order.confirmedAt)
                  : t('not_set')}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="font-label text-[10px] text-fg3">
                {t('field_session_id')}
              </dt>
              <dd
                className="mt-1 break-all font-mono text-[11px] text-fg2 num-latn"
                title={order.stripeSessionId}
              >
                {order.stripeSessionId.length > 40
                  ? `${order.stripeSessionId.slice(0, 40)}…`
                  : order.stripeSessionId}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="font-label text-[10px] text-fg3">
                {t('field_payment_intent')}
              </dt>
              <dd
                className="mt-1 break-all font-mono text-[11px] text-fg2 num-latn"
                title={order.stripePaymentIntentId ?? undefined}
              >
                {order.stripePaymentIntentId ?? t('not_set')}
              </dd>
            </div>
          </dl>
        </section>

        {/* Right: customer + booking */}
        <aside className="space-y-5 rounded-md border border-dashed border-border bg-bg-elevated p-6">
          <header className="space-y-1">
            <p className="font-label text-[10px] text-fg3">
              {t('section_customer')}
            </p>
          </header>

          <dl className="grid grid-cols-1 gap-4 text-[13px]">
            <div>
              <dt className="font-label text-[10px] text-fg3">
                {t('field_customer_name')}
              </dt>
              <dd className="text-fg1 font-display font-semibold">
                {order.userName || t('not_set')}
              </dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">
                {t('field_customer_email')}
              </dt>
              <dd>
                {order.userEmail ? (
                  <a
                    href={`mailto:${order.userEmail}`}
                    className="text-accent hover:underline"
                  >
                    {order.userEmail}
                  </a>
                ) : (
                  <span className="text-fg3">{t('not_set')}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">
                {t('field_user_id')}
              </dt>
              <dd
                className="break-all font-mono text-[11px] text-fg2 num-latn"
                title={order.userId ?? undefined}
              >
                {order.userId ?? t('not_set')}
              </dd>
            </div>
            <div className="border-t border-dashed border-border pt-4">
              <dt className="font-label text-[10px] text-fg3">
                {t('field_booking')}
              </dt>
              <dd className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/booking/bookings/${order.bookingId}/edit`}
                  className="text-fg1 font-display font-semibold hover:text-accent"
                >
                  {bookingTitle || t('not_set')}
                </Link>
                {productTypeLabel && (
                  <StatusBadge
                    status={order.bookingProductType ?? 'ONLINE_SESSION'}
                    tone={
                      order.bookingProductType === 'RECONSIDER_COURSE'
                        ? 'info'
                        : 'accent'
                    }
                    label={productTypeLabel}
                  />
                )}
              </dd>
            </div>
          </dl>

          {refundable && (
            <div className="border-t border-dashed border-border pt-4">
              <BookingOrderRefundButton
                orderId={order.id}
                amountPaid={order.amountPaid}
                currency={order.currency || 'USD'}
                email={order.userEmail || ''}
                isGift={order.giftId != null}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
