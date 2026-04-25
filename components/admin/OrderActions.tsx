'use client'

import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { Order } from '@/lib/db/queries'

export function OrderActions({ order }: { order: Order }) {
  const t = useTranslations('admin.orders')
  const tActions = useTranslations('admin.actions')

  const PILL = 'font-label inline-flex items-center justify-center gap-2 rounded-full border border-dashed px-4 py-2 text-[12px] transition-colors'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => toast.success(tActions('success_saved'))}
        className={`${PILL} border-ink bg-ink text-cream-soft hover:bg-transparent hover:text-ink`}
        style={{ letterSpacing: '0.08em' }}
      >
        {t('mark_fulfilled')}
      </button>
      <button
        type="button"
        onClick={() => toast.success(tActions('success_saved'))}
        className={`${PILL} border-amber/60 text-amber hover:bg-amber hover:text-cream-soft`}
        style={{ letterSpacing: '0.08em' }}
      >
        {t('refund')}
      </button>
      <button
        type="button"
        onClick={() => toast.success(tActions('success_saved'))}
        className={`${PILL} border-ink/40 text-ink hover:bg-cream-warm/40`}
        style={{ letterSpacing: '0.08em' }}
      >
        {t('cancel_order')}
      </button>
      {order.stripePaymentIntentId && (
        <a
          href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${PILL} border-ink/40 text-ink-muted hover:text-ink`}
          style={{ letterSpacing: '0.08em' }}
        >
          {t('open_stripe')}
        </a>
      )}
    </div>
  )
}
