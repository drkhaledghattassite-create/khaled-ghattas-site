'use client'

import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type ColumnDef } from './DataTable'
import { StatusBadge } from './StatusBadge'
import type { Subscriber, SubscriberStatus } from '@/lib/db/schema'

const STATUS_VALUES: Array<SubscriberStatus | 'all'> = [
  'all',
  'ACTIVE',
  'UNSUBSCRIBED',
  'BOUNCED',
]

type Filter = { status: SubscriberStatus | 'all'; search: string }

type Props = {
  rows: Subscriber[]
  total: number
  page: number
  pageSize: number
  initialFilter: Filter
}

// Paginated server-side list with status pills + email/name search. Replaces
// the previous client-only DataTable + CSV-only setup. CSV export still
// exports the CURRENTLY-VISIBLE rows (the active filter, on this page only) —
// for a full-archive export, use the admin CSV server action (Phase E1b
// Item 6 covers orders/booking-orders/gifts; subscribers stays page-scoped
// because the CSV header on this page is operator-facing and pageSize=50 is
// a sensible cap given the data volume).
export function SubscribersPanel({
  rows,
  total,
  page,
  pageSize,
  initialFilter,
}: Props) {
  const t = useTranslations('admin.subscribers')
  const tActions = useTranslations('admin.actions')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const setQuery = useCallback(
    (next: { status?: Filter['status']; search?: string; page?: number }) => {
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
      if (next.page !== undefined) {
        if (next.page === 1) params.delete('page')
        else params.set('page', String(next.page))
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  function exportCsv() {
    const header = 'email,name_en,name_ar,status,source,subscribed_at\n'
    const csv = rows
      .map((s) =>
        [
          s.email,
          s.nameEn ?? '',
          s.nameAr ?? '',
          s.status,
          s.source ?? '',
          s.createdAt.toISOString(),
        ]
          .map((v) => `"${v.replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n')
    const blob = new Blob([header + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(tActions('success_exported'))
  }

  const columns: ColumnDef<Subscriber>[] = [
    { accessorKey: 'email', header: t('email') },
    {
      accessorKey: 'nameEn',
      header: t('name'),
      cell: ({ row }) => row.original.nameEn ?? row.original.nameAr ?? '—',
    },
    {
      accessorKey: 'source',
      header: t('source'),
      cell: ({ row }) => row.original.source ?? '—',
    },
    {
      accessorKey: 'status',
      header: t('status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: t('subscribed_at'),
      cell: ({ row }) => row.original.createdAt.toISOString().slice(0, 10),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-fg3">{t('description')}</p>
        <button
          type="button"
          onClick={exportCsv}
          className="font-label inline-flex items-center gap-1.5 rounded-full border border-dashed border-fg1 bg-fg1 px-4 py-2 text-[12px] text-bg hover:bg-transparent hover:text-fg1"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          {t('export_csv')}
        </button>
      </div>

      <div
        role="group"
        aria-label={t('filter_aria')}
        className="flex flex-wrap items-center gap-2"
      >
        {STATUS_VALUES.map((s) => {
          const isActive = initialFilter.status === s
          const labelKey =
            s === 'all'
              ? 'filter_all'
              : s === 'ACTIVE'
                ? 'filter_active'
                : s === 'UNSUBSCRIBED'
                  ? 'filter_unsubscribed'
                  : 'filter_bounced'
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
              {t(labelKey)}
            </button>
          )
        })}
        <input
          type="search"
          defaultValue={initialFilter.search}
          placeholder={t('search_placeholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setQuery({ search: (e.target as HTMLInputElement).value })
            }
          }}
          className="ms-2 h-9 min-w-[220px] rounded-full border border-border bg-bg-elevated px-4 text-[13px] text-fg1 placeholder:text-fg3 focus:border-accent focus:outline-none"
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchable={false}
        pagination={false}
      />

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
