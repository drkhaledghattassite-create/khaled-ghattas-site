'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Download, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from '@/lib/i18n/navigation'
import { StatusBadge } from '../StatusBadge'
import { exportAdminOrdersCsvAction } from '@/app/[locale]/(admin)/admin/orders/actions'
import type { OrderStatus } from '@/lib/db/schema'

export type AdminOrderRow = {
  id: string
  customerName: string | null
  customerEmail: string
  totalAmount: string
  currency: string
  status: OrderStatus
  stripeSessionId: string | null
  createdAt: string
}

export type AdminOrdersFilter = {
  status: OrderStatus | 'all'
  search: string
  start: string
  end: string
}

const STATUSES: Array<OrderStatus | 'all'> = [
  'all',
  'PENDING',
  'PAID',
  'FULFILLED',
  'REFUNDED',
  'FAILED',
]

function fmtDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

function fmtAmount(value: string, currency: string, locale: string): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return value
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-LB' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(num)
  } catch {
    return `${num.toFixed(2)} ${currency}`
  }
}

type Props = {
  rows: AdminOrderRow[]
  total: number
  page: number
  pageSize: number
  locale: 'ar' | 'en'
  initialFilter: AdminOrdersFilter
}

export function AdminOrdersListPage({
  rows,
  total,
  page,
  pageSize,
  initialFilter,
}: Props) {
  const t = useTranslations('admin.orders')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const localeCtx = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [exporting, setExporting] = useState(false)
  const [, startTransition] = useTransition()

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const setQuery = useCallback(
    (next: Partial<AdminOrdersFilter & { page: number }>) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next.status !== undefined) {
        if (next.status === 'all') params.delete('status')
        else params.set('status', next.status)
        params.delete('page')
      }
      if (next.search !== undefined) {
        const trimmed = next.search.trim()
        if (trimmed) params.set('search', trimmed)
        else params.delete('search')
        params.delete('page')
      }
      if (next.start !== undefined) {
        if (next.start) params.set('start', next.start)
        else params.delete('start')
        params.delete('page')
      }
      if (next.end !== undefined) {
        if (next.end) params.set('end', next.end)
        else params.delete('end')
        params.delete('page')
      }
      if (next.page !== undefined) {
        if (next.page === 1) params.delete('page')
        else params.set('page', String(next.page))
      }
      const qs = params.toString()
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    },
    [pathname, router, searchParams],
  )

  function applyPreset(days: number) {
    const end = new Date()
    const start = new Date()
    start.setUTCDate(start.getUTCDate() - days + 1)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    setQuery({ start: fmt(start), end: fmt(end) })
  }

  function clearDateRange() {
    setQuery({ start: '', end: '' })
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await exportAdminOrdersCsvAction({
        status: initialFilter.status,
        search: initialFilter.search,
        start: initialFilter.start,
        end: initialFilter.end,
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success(tActions('success_exported'))
    } catch (err) {
      console.error('[AdminOrdersListPage/export]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg3">{t('description')}</p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="font-label inline-flex items-center gap-1.5 rounded-full border border-dashed border-fg1 bg-fg1 px-4 py-2 text-[12px] text-bg hover:bg-transparent hover:text-fg1 disabled:cursor-wait disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          {exporting ? t('csv_exporting') : t('csv_export')}
        </button>
      </div>

      {/* Status pills */}
      <div
        role="group"
        aria-label={t('filter_aria')}
        className="flex flex-wrap items-center gap-2"
      >
        {STATUSES.map((s) => {
          const isActive = initialFilter.status === s
          return (
            <button
              key={s}
              type="button"
              aria-pressed={isActive}
              onClick={() => setQuery({ status: s })}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-display font-semibold uppercase tracking-[0.06em] transition-colors ${
                isActive
                  ? 'border-fg1 bg-fg1 text-bg'
                  : 'border-border text-fg3 hover:bg-bg-deep'
              }`}
            >
              {s === 'all' ? t('filter_all') : t(`filter_${s.toLowerCase()}` as never)}
            </button>
          )
        })}
      </div>

      {/* Date range + search */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-display font-semibold uppercase tracking-[0.08em] text-fg3">
            {t('filter_start')}
          </span>
          <input
            type="date"
            defaultValue={initialFilter.start}
            onChange={(e) => setQuery({ start: e.target.value })}
            className="h-9 rounded-md border border-border bg-bg-elevated px-3 text-[13px] text-fg1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-display font-semibold uppercase tracking-[0.08em] text-fg3">
            {t('filter_end')}
          </span>
          <input
            type="date"
            defaultValue={initialFilter.end}
            onChange={(e) => setQuery({ end: e.target.value })}
            className="h-9 rounded-md border border-border bg-bg-elevated px-3 text-[13px] text-fg1"
          />
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset(30)}
            className="font-label rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] text-fg2 hover:bg-bg-deep"
          >
            {t('preset_last_30')}
          </button>
          <button
            type="button"
            onClick={clearDateRange}
            className="font-label rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] text-fg2 hover:bg-bg-deep"
          >
            {t('preset_all_time')}
          </button>
        </div>
        <label className="ms-auto flex flex-col gap-1">
          <span className="text-[11px] font-display font-semibold uppercase tracking-[0.08em] text-fg3">
            {t('filter_search')}
          </span>
          <input
            type="search"
            defaultValue={initialFilter.search}
            placeholder={t('search_placeholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setQuery({ search: (e.target as HTMLInputElement).value })
              }
            }}
            className="h-9 min-w-[240px] rounded-full border border-border bg-bg-elevated px-4 text-[13px] text-fg1 placeholder:text-fg3 focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-bg-elevated p-10 text-center">
          <p className="m-0 text-[14px] text-fg3 font-display">{t('empty')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-bg-elevated">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-bg-deep">
              <tr>
                <Th text={t('created_at')} />
                <Th text={t('customer')} />
                <Th text={t('total')} />
                <Th text={t('status')} />
                <Th text={tForms('actions')} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-border hover:bg-bg-deep/50"
                >
                  <td className="px-3 py-2 text-fg1 align-middle">
                    {fmtDate(row.createdAt, localeCtx)}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium text-fg1">
                        {row.customerName ?? '—'}
                      </span>
                      <span className="text-[11px] text-fg3">
                        {row.customerEmail}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle text-fg1">
                    {fmtAmount(row.totalAmount, row.currency, localeCtx)}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <Link
                      href={`/admin/orders/${row.id}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
                      aria-label={tForms('view')}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-[12px] text-fg3 font-display">
            {t('pagination_page_of', { current: page, total: totalPages })}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuery({ page: Math.max(1, page - 1) })}
              disabled={page <= 1}
              className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-[12px] font-display font-semibold uppercase tracking-[0.06em] text-fg2 transition-colors hover:bg-bg-deep hover:text-fg1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('pagination_previous')}
            </button>
            <button
              type="button"
              onClick={() => setQuery({ page: Math.min(totalPages, page + 1) })}
              disabled={page >= totalPages}
              className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-[12px] font-display font-semibold uppercase tracking-[0.06em] text-fg2 transition-colors hover:bg-bg-deep hover:text-fg1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('pagination_next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Th({ text }: { text: string }) {
  return (
    <th
      scope="col"
      className="px-3 py-2.5 text-start text-[10px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold"
    >
      {text}
    </th>
  )
}
