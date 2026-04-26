import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { ChevronLeft } from 'lucide-react'
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

  return (
    <div className="space-y-6">
      <Link
        href="/admin/orders"
        className="font-label inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3 w-3 rtl:rotate-180" aria-hidden />
        {t('back_to_orders')}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4 rounded-md border border-dashed border-ink/30 bg-cream-soft p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-label text-[10px] text-ink-muted">{t('id')}</p>
              <p className="font-mono text-[14px] text-ink">{order.id}</p>
            </div>
            <StatusBadge status={order.status} />
          </header>

          <dl className="grid grid-cols-2 gap-4 border-t border-dashed border-ink/30 pt-4 text-[13px]">
            <div>
              <dt className="font-label text-[10px] text-ink-muted">{t('total')}</dt>
              <dd
                className="text-ink font-display font-semibold text-[24px]"
              >
                ${order.totalAmount} {order.currency}
              </dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-ink-muted">{t('created_at')}</dt>
              <dd className="text-ink">{order.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-ink-muted">Stripe PI</dt>
              <dd className="font-mono text-[11px] text-ink-muted">
                {order.stripePaymentIntentId ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-ink-muted">Stripe Session</dt>
              <dd className="font-mono text-[11px] text-ink-muted">
                {order.stripeSessionId ?? '—'}
              </dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-4 rounded-md border border-dashed border-ink/30 bg-cream-soft p-6">
          <h2
            className="text-ink font-display font-semibold text-[14px] uppercase tracking-[0.04em]"
          >
            {t('customer')}
          </h2>
          <dl className="space-y-2 text-[13px]">
            <div>
              <dt className="font-label text-[10px] text-ink-muted">Name</dt>
              <dd className="text-ink">{order.customerName ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-ink-muted">Email</dt>
              <dd className="text-ink">{order.customerEmail}</dd>
            </div>
            {order.userId && (
              <div>
                <dt className="font-label text-[10px] text-ink-muted">User ID</dt>
                <dd className="font-mono text-[11px] text-ink-muted">{order.userId}</dd>
              </div>
            )}
          </dl>
        </aside>
      </div>

      <section className="space-y-3 rounded-md border border-dashed border-ink/30 bg-cream-soft p-6">
        <h2
          className="text-ink"
          style={{
            fontFamily: 'var(--font-oswald)',
            fontWeight: 600,
            fontSize: 14,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {t('actions')}
        </h2>
        <OrderActions order={order} />
      </section>
    </div>
  )
}
