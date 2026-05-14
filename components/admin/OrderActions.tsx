'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'
import { useRouter } from '@/lib/i18n/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { resendOrderReceiptAction } from '@/app/[locale]/(admin)/admin/orders/actions'
import type { Order } from '@/lib/db/queries'

const PILL =
  'inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

type ActionStatus = 'FULFILLED' | 'REFUNDED' | 'FAILED'

export function OrderActions({ order }: { order: Order }) {
  const t = useTranslations('admin.orders')
  const tActions = useTranslations('admin.actions')
  const tConfirm = useTranslations('admin.orders.confirm')
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [openAction, setOpenAction] = useState<ActionStatus | null>(null)
  const [resending, startResend] = useTransition()
  // Only PAID / FULFILLED orders have a receipt worth re-sending. REFUNDED
  // and FAILED orders have nothing to deliver. Matches the server-side
  // wrong_status gate.
  const canResend =
    !resending &&
    !busy &&
    (order.status === 'PAID' || order.status === 'FULFILLED') &&
    order.customerEmail.length > 0

  function handleResendReceipt() {
    startResend(async () => {
      try {
        const res = await resendOrderReceiptAction({ orderId: order.id })
        if (!res.ok) {
          const key =
            res.error === 'rate_limited'
              ? 'resend_rate_limited'
              : res.error === 'no_email'
                ? 'resend_no_email'
                : res.error === 'wrong_status'
                  ? 'resend_wrong_status'
                  : res.error === 'not_found'
                    ? 'resend_not_found'
                    : 'resend_failed'
          toast.error(t(key))
          return
        }
        if (res.emailOutcome === 'send_failed') {
          toast.warning(t('resend_send_failed'))
        } else if (res.emailOutcome === 'preview_only') {
          toast.info(t('resend_preview_only'))
        } else {
          toast.success(t('resend_success'))
        }
      } catch (err) {
        console.error('[OrderActions handleResendReceipt]', err)
        toast.error(tActions('error_generic'))
      }
    })
  }

  const isTerminal = order.status === 'REFUNDED' || order.status === 'FAILED'
  const canFulfill = !busy && !isTerminal && order.status !== 'FULFILLED'
  const canRefund =
    !busy &&
    !isTerminal &&
    !!order.stripePaymentIntentId &&
    (order.status === 'PAID' || order.status === 'FULFILLED')
  const canCancel = !busy && !isTerminal && order.status !== 'FULFILLED'

  async function patchStatus(status: ActionStatus) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: { code?: string; message?: string }
      }
      if (!res.ok) {
        toast.error(json.error?.message ?? tActions('error_generic'))
        return
      }
      toast.success(tActions('success_saved'))
      router.refresh()
    } catch (err) {
      console.error('[OrderActions]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setBusy(false)
      setOpenAction(null)
    }
  }

  function handleConfirm() {
    if (openAction) void patchStatus(openAction)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AlertDialog
        open={openAction === 'FULFILLED'}
        onOpenChange={(o) => !o && setOpenAction(null)}
      >
        <AlertDialogTrigger
          disabled={!canFulfill}
          onClick={() => setOpenAction('FULFILLED')}
          className={`${PILL} border-fg1 bg-fg1 text-bg hover:bg-transparent hover:text-fg1`}
        >
          {t('mark_fulfilled')}
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm('fulfill_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm('fulfill_description', {
                amount: `${order.totalAmount} ${order.currency}`,
                email: order.customerEmail,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {tConfirm('back')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={busy}>
              {tConfirm('fulfill_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={openAction === 'REFUNDED'}
        onOpenChange={(o) => !o && setOpenAction(null)}
      >
        <AlertDialogTrigger
          disabled={!canRefund}
          onClick={() => setOpenAction('REFUNDED')}
          title={
            !order.stripePaymentIntentId
              ? tActions('refund_no_payment_intent')
              : undefined
          }
          className={`${PILL} border-accent/60 text-accent hover:bg-accent hover:text-accent-fg`}
        >
          {t('refund')}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm('refund_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm('refund_description', {
                amount: `${order.totalAmount} ${order.currency}`,
                email: order.customerEmail,
              })}
            </AlertDialogDescription>
            {/* Phase D — gift-aware refund warning. Refunding a gift-claimed
                order cascades through markGiftRefunded → deleteOrderForGift,
                removing the recipient's library access. Surface that
                explicitly before the admin commits. */}
            {order.giftId && (
              <AlertDialogDescription className="mt-2 rounded-md border border-accent/40 bg-accent-soft/60 px-3 py-2 text-accent">
                {tConfirm('refund_gift_warning')}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {tConfirm('back')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={busy}
              variant="destructive"
            >
              {busy ? tConfirm('refunding') : tConfirm('refund_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={openAction === 'FAILED'}
        onOpenChange={(o) => !o && setOpenAction(null)}
      >
        <AlertDialogTrigger
          disabled={!canCancel}
          onClick={() => setOpenAction('FAILED')}
          className={`${PILL} border-border-strong text-fg2 hover:bg-bg-deep`}
        >
          {t('cancel_order')}
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm('cancel_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm('cancel_description', {
                amount: `${order.totalAmount} ${order.currency}`,
                email: order.customerEmail,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {tConfirm('back')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={busy}
              variant="destructive"
            >
              {tConfirm('cancel_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <button
        type="button"
        onClick={handleResendReceipt}
        disabled={!canResend}
        title={
          !canResend && order.status !== 'PAID' && order.status !== 'FULFILLED'
            ? t('resend_wrong_status')
            : undefined
        }
        className={`${PILL} border-border-strong text-fg2 hover:bg-bg-deep`}
      >
        <Mail aria-hidden className="h-3 w-3" />
        {resending ? t('resending') : t('resend_receipt')}
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
