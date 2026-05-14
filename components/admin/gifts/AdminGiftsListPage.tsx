'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Link, useRouter } from '@/lib/i18n/navigation'
import { exportAdminGiftsCsvAction } from '@/app/[locale]/(admin)/admin/gifts/actions'
import type { GiftItemType, GiftSource, GiftStatus } from '@/lib/db/schema'

export type AdminGiftRow = {
  id: string
  source: GiftSource
  status: GiftStatus
  itemType: GiftItemType
  recipientEmail: string
  amountCents: number | null
  currency: string
  createdAt: string
  expiresAt: string
}

export type AdminGiftsFilter = {
  status: GiftStatus | 'all'
  source: GiftSource | 'all'
  itemType: GiftItemType | 'all'
  search: string
}

function fmtAmount(cents: number | null, currency: string, locale: string): string {
  if (cents == null) return '—'
  const major = (cents / 100).toFixed(2)
  return locale === 'ar' ? `${major} ${currency.toUpperCase()}` : `${currency.toUpperCase()} ${major}`
}

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

const STATUSES: Array<GiftStatus | 'all'> = [
  'all',
  'PENDING',
  'CLAIMED',
  'EXPIRED',
  'REVOKED',
  'REFUNDED',
]
const SOURCES: Array<GiftSource | 'all'> = ['all', 'ADMIN_GRANT', 'USER_PURCHASE']
const ITEM_TYPES: Array<GiftItemType | 'all'> = [
  'all',
  'BOOK',
  'SESSION',
  'BOOKING',
]

export function AdminGiftsListPage({
  rows,
  total,
  page,
  pageSize,
  locale,
  initialFilter,
}: {
  rows: AdminGiftRow[]
  total: number
  page: number
  pageSize: number
  locale: 'ar' | 'en'
  initialFilter: AdminGiftsFilter
}) {
  const t = useTranslations('admin.gifts.list')
  const tStatus = useTranslations('dashboard.gifts.row')
  const localeCtx = useLocale()
  const isRtl = localeCtx === 'ar'
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const res = await exportAdminGiftsCsvAction({
        status: initialFilter.status,
        source: initialFilter.source,
        itemType: initialFilter.itemType,
        search: initialFilter.search,
      })
      if (!res.ok) {
        toast.error(t('csv_error'))
        return
      }
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = res.filename
      link.click()
      URL.revokeObjectURL(url)
      toast.success(t('csv_done'))
    } catch (err) {
      console.error('[AdminGiftsListPage/export]', err)
      toast.error(t('csv_error'))
    } finally {
      setExporting(false)
    }
  }

  function applyFilter(patch: Partial<AdminGiftsFilter>) {
    const merged = { ...initialFilter, ...patch }
    const params = new URLSearchParams()
    if (merged.status !== 'all') params.set('status', merged.status)
    if (merged.source !== 'all') params.set('source', merged.source)
    if (merged.itemType !== 'all') params.set('itemType', merged.itemType)
    if (merged.search.trim()) params.set('search', merged.search.trim())
    startTransition(() => {
      router.push(`/admin/gifts${params.size ? `?${params.toString()}` : ''}`)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
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
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          defaultValue={initialFilter.search}
          placeholder={t('search_placeholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              applyFilter({ search: (e.target as HTMLInputElement).value })
            }
          }}
          className={`flex-1 min-w-[220px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-[14px] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
          dir="ltr"
        />
        <FilterDropdown
          label={t('filter_status')}
          value={initialFilter.status}
          options={STATUSES.map((s) => ({
            value: s,
            label:
              s === 'all'
                ? t('filter_all')
                : tStatus(`status_${s.toLowerCase()}` as never),
          }))}
          onChange={(v) => applyFilter({ status: v as GiftStatus | 'all' })}
        />
        <FilterDropdown
          label={t('filter_source')}
          value={initialFilter.source}
          options={SOURCES.map((s) => ({
            value: s,
            label:
              s === 'all'
                ? t('filter_all')
                : s === 'ADMIN_GRANT'
                  ? t('source_admin')
                  : t('source_user'),
          }))}
          onChange={(v) => applyFilter({ source: v as GiftSource | 'all' })}
        />
        <FilterDropdown
          label={t('filter_item')}
          value={initialFilter.itemType}
          options={ITEM_TYPES.map((s) => ({
            value: s,
            label:
              s === 'all'
                ? t('filter_all')
                : s === 'BOOK'
                  ? tStatus('type_book')
                  : s === 'SESSION'
                    ? tStatus('type_session')
                    : s === 'BOOKING'
                      ? tStatus('type_booking')
                      : 'TEST',
          }))}
          onChange={(v) => applyFilter({ itemType: v as GiftItemType | 'all' })}
        />
      </div>

      {rows.length === 0 ? (
        <p
          className={`m-0 text-[14px] text-[var(--color-fg3)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--color-bg-deep)] text-[var(--color-fg3)]">
              <tr>
                <Th text={t('table.created')} isRtl={isRtl} />
                <Th text={t('table.recipient')} isRtl={isRtl} />
                <Th text={t('table.item')} isRtl={isRtl} />
                <Th text={t('table.source')} isRtl={isRtl} />
                <Th text={t('table.status')} isRtl={isRtl} />
                <Th text={t('table.amount')} isRtl={isRtl} />
                <Th text={t('table.actions')} isRtl={isRtl} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-deep)]/50"
                >
                  <td className="px-3 py-2 align-middle">
                    {fmtDate(row.createdAt, localeCtx)}
                  </td>
                  <td className="px-3 py-2 align-middle break-all">
                    {row.recipientEmail}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    {row.itemType === 'BOOK'
                      ? tStatus('type_book')
                      : row.itemType === 'SESSION'
                        ? tStatus('type_session')
                        : row.itemType === 'BOOKING'
                          ? tStatus('type_booking')
                          : 'TEST'}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    {row.source === 'ADMIN_GRANT' ? t('source_admin') : t('source_user')}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    {tStatus(`status_${row.status.toLowerCase()}` as never)}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    {fmtAmount(row.amountCents, row.currency, localeCtx)}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <Link
                      href={`/admin/gifts/${row.id}`}
                      className="text-[var(--color-accent)] underline"
                    >
                      {t('view_cta')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[12px] text-[var(--color-fg3)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {page} / {Math.ceil(total / pageSize)}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || isPending}
              onClick={() => {
                const params = new URLSearchParams()
                if (initialFilter.status !== 'all') params.set('status', initialFilter.status)
                if (initialFilter.source !== 'all') params.set('source', initialFilter.source)
                if (initialFilter.itemType !== 'all') params.set('itemType', initialFilter.itemType)
                if (initialFilter.search.trim()) params.set('search', initialFilter.search.trim())
                params.set('page', String(page - 1))
                router.push(`/admin/gifts?${params.toString()}`)
              }}
              className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[13px] disabled:opacity-50"
            >
              ‹
            </button>
            <button
              type="button"
              disabled={page >= Math.ceil(total / pageSize) || isPending}
              onClick={() => {
                const params = new URLSearchParams()
                if (initialFilter.status !== 'all') params.set('status', initialFilter.status)
                if (initialFilter.source !== 'all') params.set('source', initialFilter.source)
                if (initialFilter.itemType !== 'all') params.set('itemType', initialFilter.itemType)
                if (initialFilter.search.trim()) params.set('search', initialFilter.search.trim())
                params.set('page', String(page + 1))
                router.push(`/admin/gifts?${params.toString()}`)
              }}
              className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[13px] disabled:opacity-50"
            >
              ›
            </button>
          </div>
        </div>
      )}
      {/* Acknowledge unused locale prop to keep typecheck strict */}
      <span className="hidden" data-locale={locale} aria-hidden />
    </div>
  )
}

function Th({ text, isRtl }: { text: string; isRtl: boolean }) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] ${
        isRtl ? 'text-end font-arabic-body' : 'text-start font-display'
      }`}
    >
      {text}
    </th>
  )
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (v: string) => void
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-fg3)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 py-1.5 text-[13px]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
