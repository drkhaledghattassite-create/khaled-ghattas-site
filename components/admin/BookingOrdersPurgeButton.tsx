'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
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
import { purgeStaleBookingOrdersAction } from '@/app/[locale]/(admin)/admin/booking/actions'

export function BookingOrdersPurgeButton() {
  const t = useTranslations('admin.booking_orders')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.booking_actions')
  const tConfirm = useTranslations('admin.booking_confirm')
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  async function handlePurge() {
    setBusy(true)
    try {
      const result = await purgeStaleBookingOrdersAction()
      if (!result.ok) {
        toast.error(tActions(`error_${result.error}` as 'error_db_failed'))
        return
      }
      toast.success(tActions('success_purge', { count: result.count }))
      setOpen(false)
      startTransition(() => router.refresh())
    } catch (err) {
      console.error('[BookingOrdersPurgeButton]', err)
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
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.08em] text-fg2 transition-colors hover:border-fg1 hover:text-fg1"
      >
        <Trash2 className="h-3 w-3" aria-hidden />
        {t('purge_stale')}
      </button>

      <AlertDialog
        open={open}
        onOpenChange={(next) => !busy && setOpen(next)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm('purge_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm('purge_body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {tForms('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurge}
              disabled={busy}
              variant="destructive"
            >
              {tConfirm('purge_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
