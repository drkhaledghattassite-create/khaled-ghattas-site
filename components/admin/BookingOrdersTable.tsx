'use client'

import { useMemo, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Eye, RotateCw } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { DataTable, type ColumnDef } from './DataTable'
import { StatusBadge } from './StatusBadge'
import { triggerBookingRefundAction } from '@/app/[locale]/(admin)/admin/booking/actions'
import type { BookingOrderWithMeta } from '@/lib/db/queries'

type Filter = 'all' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

const FILTER_KEYS: Record<Filter, string> = {
  all: 'filter_all',
  PENDING: 'filter_pending',
  PAID: 'filter_paid',
  FAILED: 'filter_failed',
  REFUNDED: 'filter_refunded',
}

const ORDER_FILTERS: Filter[] = ['all', 'PENDING', 'PAID', 'FAILED', 'REFUNDED']

function shortId(id: string): string {
  // Last 8 chars + ellipsis prefix — UUID v4 last segment is naturally
  // entropy-rich, so collisions on a single page are vanishingly rare.
  if (id.length <= 8) return id
  return `…${id.slice(-8)}`
}

export function BookingOrdersTable({
  orders,
}: {
  orders: BookingOrderWithMeta[]
}) {
  const t = useTranslations('admin.booking_orders')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.booking_actions')
  const tConfirm = useTranslations('admin.booking_confirm')
  const locale = useLocale()
  const router = useRouter()

  const [filter, setFilter] = useState<Filter>('all')
  const [pending, setPending] = useState<BookingOrderWithMeta | null>(null)
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
        dateStyle: 'medium',
      }),
    [locale],
  )

  const priceFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
        style: 'currency',
        currency: 'USD',
      }),
    [locale],
  )

  const filtered = useMemo(() => {
    if (filter === 'all') return orders
    return orders.filter((o) => o.status === filter)
  }, [filter, orders])

  function formatAmount(order: BookingOrderWithMeta): string {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: order.currency || 'USD',
    }).format(order.amountPaid / 100)
  }

  async function handleRefund() {
    if (!pending) return
    setBusy(true)
    try {
      const result = await triggerBookingRefundAction({ orderId: pending.id })
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
      setPending(null)
      startTransition(() => router.refresh())
    } catch (err) {
      console.error('[BookingOrdersTable/refund]', err)
      toast.error(tActions('error_db_failed'))
    } finally {
      setBusy(false)
    }
  }

  const columns: ColumnDef<BookingOrderWithMeta>[] = [
    {
      id: 'orderId',
      header: t('col_id'),
      cell: ({ row }) => (
        <span className="font-mono text-[12px] text-fg2 num-latn">
          {shortId(row.original.id)}
        </span>
      ),
    },
    {
      id: 'customer',
      header: t('col_customer'),
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-fg1">
            {row.original.userName || row.original.userEmail || '—'}
          </span>
          {row.original.userName && row.original.userEmail && (
            <span className="text-[11px] text-fg3">
              {row.original.userEmail}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'booking',
      header: t('col_booking'),
      cell: ({ row }) => {
        const title =
          locale === 'ar'
            ? row.original.bookingTitleAr
            : row.original.bookingTitleEn
        return <span className="text-fg1">{title || '—'}</span>
      },
    },
    {
      id: 'amount',
      header: t('col_amount'),
      cell: ({ row }) => (
        <span className="num-latn font-display">
          {formatAmount(row.original)}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('col_status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'createdAt',
      header: t('col_created_at'),
      cell: ({ row }) => (
        <span className={cn(locale === 'en' && 'num-latn')}>
          {dateFmt.format(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('col_actions'),
      enableSorting: false,
      cell: ({ row }) => {
        const refundable =
          row.original.status === 'PAID' &&
          row.original.stripePaymentIntentId !== null
        return (
          <div className="flex items-center gap-1">
            <Link
              href={`/admin/booking/orders/${row.original.id}`}
              className="inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] font-display font-semibold uppercase tracking-[0.06em] text-fg3 hover:bg-bg-deep hover:text-fg1"
            >
              <Eye className="h-3 w-3" aria-hidden />
              {t('view_detail')}
            </Link>
            {refundable && (
              <button
                type="button"
                onClick={() => setPending(row.original)}
                className="inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] font-display font-semibold uppercase tracking-[0.06em] text-accent/80 hover:bg-accent-soft hover:text-accent"
              >
                <RotateCw className="h-3 w-3" aria-hidden />
                {t('refund')}
              </button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <>
      <FilterChips current={filter} onChange={setFilter} />
      <DataTable columns={columns} data={filtered} />

      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => !open && !busy && setPending(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm('refund_title')}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {pending &&
                tConfirm('refund_body', {
                  amount: priceFmt.format(pending.amountPaid / 100),
                  email: pending.userEmail || '—',
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

function FilterChips({
  current,
  onChange,
}: {
  current: Filter
  onChange: (next: Filter) => void
}) {
  const t = useTranslations('admin.booking_orders')
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-elevated p-1">
      {ORDER_FILTERS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            'rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.08em] font-display font-semibold transition-colors',
            current === key ? 'bg-fg1 text-bg' : 'text-fg3 hover:text-fg1',
          )}
        >
          {t(FILTER_KEYS[key])}
        </button>
      ))}
    </div>
  )
}

