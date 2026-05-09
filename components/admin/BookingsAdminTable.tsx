'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link, useRouter } from '@/lib/i18n/navigation'
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
import { Switch } from '@/components/ui/switch'
import { DataTable, type ColumnDef } from './DataTable'
import { StatusBadge, type StatusBadgeTone } from './StatusBadge'
import { deleteBookingAction } from '@/app/[locale]/(admin)/admin/booking/actions'
import type { BookingWithHolds } from '@/lib/db/queries'

const TYPE_TONE: Record<BookingWithHolds['productType'], StatusBadgeTone> = {
  RECONSIDER_COURSE: 'info',
  ONLINE_SESSION: 'accent',
}

const STATE_TONE: Record<BookingWithHolds['bookingState'], StatusBadgeTone> = {
  OPEN: 'positive',
  CLOSED: 'neutral',
  SOLD_OUT: 'warning',
}

export function BookingsAdminTable({
  bookings,
}: {
  bookings: BookingWithHolds[]
}) {
  const t = useTranslations('admin.booking_bookings')
  const tForms = useTranslations('admin.forms')
  const tBookingForm = useTranslations('admin.booking_booking_form')
  const tActions = useTranslations('admin.booking_actions')
  const tConfirm = useTranslations('admin.booking_confirm')
  const tAria = useTranslations('admin.aria')
  const locale = useLocale()
  const router = useRouter()

  const [pending, setPending] = useState<{ id: string; name: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // priceUsd is stored in cents — format as USD with two decimals.
  const priceFmt = new Intl.NumberFormat(
    locale === 'ar' ? 'ar-EG' : 'en-US',
    { style: 'currency', currency: 'USD' },
  )

  async function handleDelete(id: string) {
    setBusy(id)
    try {
      const result = await deleteBookingAction(id)
      if (!result.ok) {
        if (result.error === 'has_orders') {
          toast.error(tActions('error_has_orders'))
        } else {
          toast.error(tActions(`error_${result.error}` as 'error_db_failed'))
        }
        return
      }
      toast.success(tActions('success_deleted'))
      router.refresh()
    } catch (err) {
      console.error('[BookingsAdminTable/delete]', err)
      toast.error(tActions('error_db_failed'))
    } finally {
      setBusy(null)
      setPending(null)
    }
  }

  function handleToggleActive(id: string, _next: boolean) {
    // Active is one of many fields on the booking row — toggling without
    // reloading the rest of the form data isn't safe (we don't want to send
    // a partial PATCH that resets capacity/state). Send the user to the
    // edit page where the change is explicit and submitted with the full
    // form. This mirrors how the corporate admin handles ambiguous toggles.
    void _next
    startTransition(() => {
      router.push(`/admin/booking/bookings/${id}/edit`)
    })
  }

  const columns: ColumnDef<BookingWithHolds>[] = [
    {
      accessorKey: 'titleEn',
      header: t('col_title'),
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-fg1">{row.original.titleEn}</span>
          <span dir="rtl" className="text-[11px] text-fg3">
            {row.original.titleAr}
          </span>
        </div>
      ),
    },
    {
      id: 'productType',
      header: t('col_type'),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.productType}
          tone={TYPE_TONE[row.original.productType]}
          label={
            row.original.productType === 'RECONSIDER_COURSE'
              ? t('type_reconsider')
              : t('type_session')
          }
        />
      ),
    },
    {
      id: 'price',
      header: t('col_price'),
      cell: ({ row }) => (
        <span className="num-latn">
          {priceFmt.format(row.original.priceUsd / 100)}
        </span>
      ),
    },
    {
      id: 'capacity',
      header: t('col_capacity'),
      cell: ({ row }) => {
        const { bookedCount, maxCapacity, activeHoldsCount } = row.original
        return (
          <span className="num-latn text-fg1">
            {activeHoldsCount > 0
              ? t('capacity_with_holds', {
                  booked: bookedCount,
                  max: maxCapacity,
                  holds: activeHoldsCount,
                })
              : t('capacity_no_holds', {
                  booked: bookedCount,
                  max: maxCapacity,
                })}
          </span>
        )
      },
    },
    {
      id: 'bookingState',
      header: t('col_state'),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.bookingState}
          tone={STATE_TONE[row.original.bookingState]}
          label={tBookingForm(
            row.original.bookingState === 'OPEN'
              ? 'booking_state_open'
              : row.original.bookingState === 'CLOSED'
              ? 'booking_state_closed'
              : 'booking_state_sold_out',
          )}
        />
      ),
    },
    {
      id: 'isActive',
      header: t('col_active'),
      enableSorting: false,
      cell: ({ row }) => (
        <Switch
          checked={row.original.isActive}
          onCheckedChange={(next) => handleToggleActive(row.original.id, next)}
          aria-label={tAria('edit_item', {
            name: row.original.titleEn || row.original.slug,
          })}
        />
      ),
    },
    {
      id: 'actions',
      header: t('col_actions'),
      enableSorting: false,
      cell: ({ row }) => {
        const displayName =
          row.original.titleEn || row.original.titleAr || row.original.slug
        return (
          <div className="flex items-center gap-1">
            <Link
              href={`/admin/booking/bookings/${row.original.id}/edit`}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
              aria-label={tAria('edit_item', { name: displayName })}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <button
              type="button"
              disabled={busy === row.original.id}
              onClick={() => setPending({ id: row.original.id, name: displayName })}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-accent/80 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
              aria-label={tAria('delete_item', { name: displayName })}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <DataTable columns={columns} data={bookings} />
      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tConfirm('delete_booking_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending &&
                tConfirm('delete_booking_body', { title: pending.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>
              {tForms('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pending && handleDelete(pending.id)}
              disabled={busy !== null}
              variant="destructive"
            >
              {tConfirm('delete_booking_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
