'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { RotateCw } from 'lucide-react'
import { toast } from 'sonner'
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
} from '@/components/ui/alert-dialog'
import { triggerBookingRefundAction } from '@/app/[locale]/(admin)/admin/booking/actions'

type Props = {
  orderId: string
  amountPaid: number
  currency: string
  email: string
}

export function BookingOrderRefundButton({
  orderId,
  amountPaid,
  currency,
  email,
}: Props) {
  const t = useTranslations('admin.booking_orders')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.booking_actions')
  const tConfirm = useTranslations('admin.booking_confirm')
  const locale = useLocale()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  const priceFmt = new Intl.NumberFormat(
    locale === 'ar' ? 'ar-EG' : 'en-US',
    { style: 'currency', currency: currency || 'USD' },
  )

  async function handleRefund() {
    setBusy(true)
    try {
      const result = await triggerBookingRefundAction({ orderId })
      if (!result.ok) {
        if (result.error === 'invalid_refund_target') {
          toast.error(tActions('error_invalid_refund_target'))
        } else if (result.error === 'stripe_unconfigured') {
          toast.error(tActions('error_stripe_unconfigured'))
        } else if (result.error === 'stripe_refund_failed') {
          toast.error(
            tActions('error_stripe_refund_failed', {
              message: result.data.stripeMessage,
            }),
          )
        } else if (result.error === 'order_not_found') {
          toast.error(tActions('error_order_not_found'))
        } else {
          toast.error(tActions('error_db_failed'))
        }
        return
      }
      toast.success(tActions('success_refund_initiated'))
      setOpen(false)
      startTransition(() => router.refresh())
    } catch (err) {
      console.error('[BookingOrderRefundButton]', err)
      toast.error(tActions('error_db_failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-fg1 bg-fg1 px-4 py-2 text-[12px] font-display font-semibold uppercase tracking-[0.08em] text-bg transition-colors hover:bg-accent hover:border-accent hover:text-accent-fg"
      >
        <RotateCw className="h-3.5 w-3.5" aria-hidden />
        {t('refund')}
      </button>

      <AlertDialog
        open={open}
        onOpenChange={(next) => !busy && setOpen(next)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm('refund_title')}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {tConfirm('refund_body', {
                amount: priceFmt.format(amountPaid / 100),
                email: email || '—',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {tForms('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefund}
              disabled={busy}
              variant="destructive"
            >
              {tConfirm('refund_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
