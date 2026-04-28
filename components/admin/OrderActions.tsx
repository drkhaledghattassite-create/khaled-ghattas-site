'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from '@/lib/i18n/navigation'
import type { Order } from '@/lib/db/queries'

const PILL =
  'inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

export function OrderActions({ order }: { order: Order }) {
  const t = useTranslations('admin.orders')
  const tActions = useTranslations('admin.actions')
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function patchStatus(status: 'FULFILLED' | 'REFUNDED' | 'FAILED') {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_saved'))
      router.refresh()
    } catch (err) {
      console.error('[OrderActions]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => patchStatus('FULFILLED')}
        className={`${PILL} border-fg1 bg-fg1 text-bg hover:bg-transparent hover:text-fg1`}
      >
        {t('mark_fulfilled')}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => patchStatus('REFUNDED')}
        className={`${PILL} border-accent/60 text-accent hover:bg-accent hover:text-accent-fg`}
      >
        {t('refund')}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => patchStatus('FAILED')}
        className={`${PILL} border-border-strong text-fg2 hover:bg-bg-deep`}
      >
        {t('cancel_order')}
      </button>
      {order.stripePaymentIntentId && (
        <a
          href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${PILL} border-border-strong text-fg3 hover:text-fg1`}
        >
          {t('open_stripe')}
        </a>
      )}
    </div>
  )
}
