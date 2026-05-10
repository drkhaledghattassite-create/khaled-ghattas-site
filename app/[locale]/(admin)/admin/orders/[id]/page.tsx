import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { ChevronLeft, Gift } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { OrderActions } from '@/components/admin/OrderActions'
import { getOrderById } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function AdminOrderDetailPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const order = await getOrderById(id)
  if (!order) notFound()

  const t = await getTranslations('admin.orders')
  const tCommon = await getTranslations('admin.common')

  return (
    <div className="space-y-6">
      <Link
        href="/admin/orders"
        className="font-label inline-flex items-center gap-1 text-[12px] text-fg3 hover:text-fg1"
      >
        <ChevronLeft className="h-3 w-3 rtl:rotate-180" aria-hidden />
        {t('back_to_orders')}
      </Link>

      {/* Phase D — gift-claim badge. When set, this order was created by
          the gift claim flow (recipient redeeming a USER_PURCHASE or
          ADMIN_GRANT gift). Refunding here will revoke the recipient's
          access — the OrderActions modal surfaces an extra warning. */}
      {order.giftId && (
        <Link
          href={`/admin/gifts/${order.giftId}`}
          className="inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent-soft/60 px-3 py-2 text-[12px] font-display font-semibold text-accent transition-colors hover:border-accent hover:bg-accent-soft"
        >
          <Gift className="h-3.5 w-3.5" aria-hidden />
          {t('gift_claim_badge')}
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4 rounded-md border border-dashed border-border bg-bg-elevated p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-label text-[10px] text-fg3">{t('id')}</p>
              <p className="font-mono text-[14px] text-fg1">{order.id}</p>
            </div>
            <StatusBadge status={order.status} />
          </header>

          <dl className="grid grid-cols-2 gap-4 border-t border-dashed border-border pt-4 text-[13px]">
            <div>
              <dt className="font-label text-[10px] text-fg3">{t('total')}</dt>
              <dd className="text-fg1 font-display font-semibold text-[24px]">
                ${order.totalAmount} {order.currency}
              </dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">{t('created_at')}</dt>
              <dd className="text-fg1">{order.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">{tCommon('stripe_payment_intent')}</dt>
              <dd className="font-mono text-[11px] text-fg3">
                {order.stripePaymentIntentId ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">{tCommon('stripe_session')}</dt>
              <dd className="font-mono text-[11px] text-fg3">
                {order.stripeSessionId ?? '—'}
              </dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-4 rounded-md border border-dashed border-border bg-bg-elevated p-6">
          <h2 className="text-fg1 font-display font-semibold text-[14px] uppercase tracking-[0.04em]">
            {t('customer')}
          </h2>
          <dl className="space-y-2 text-[13px]">
            <div>
              <dt className="font-label text-[10px] text-fg3">{tCommon('name_field')}</dt>
              <dd className="text-fg1">{order.customerName ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">{tCommon('email_field')}</dt>
              <dd className="text-fg1">{order.customerEmail}</dd>
            </div>
            {order.userId && (
              <div>
                <dt className="font-label text-[10px] text-fg3">{tCommon('user_id')}</dt>
                <dd className="font-mono text-[11px] text-fg3">{order.userId}</dd>
              </div>
            )}
          </dl>
        </aside>
      </div>

      <section className="space-y-3 rounded-md border border-dashed border-border bg-bg-elevated p-6">
        {/* Heading style mirrors the sibling <h2> above — Qalem v2 tokens, no inline style. */}
        <h2 className="text-fg1 font-display font-semibold text-[14px] uppercase tracking-[0.04em]">
          {t('actions')}
        </h2>
        <OrderActions order={order} />
      </section>
    </div>
  )
}
