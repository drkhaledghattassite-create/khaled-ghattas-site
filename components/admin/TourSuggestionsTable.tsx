'use client'

import { useMemo, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from '@/lib/i18n/navigation'
import { cn } from '@/lib/utils'
import { DataTable, type ColumnDef } from './DataTable'
import { StatusBadge } from './StatusBadge'
import { markSuggestionReviewedAction } from '@/app/[locale]/(admin)/admin/booking/actions'
import type { TourSuggestionWithUser } from '@/lib/db/queries'



type Filter = 'all' | 'pending' | 'reviewed'

const NOTES_TRUNCATE_LIMIT = 80

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value
  return `${value.slice(0, limit).trimEnd()}…`
}

export function TourSuggestionsTable({
  suggestions,
}: {
  suggestions: TourSuggestionWithUser[]
}) {
  const t = useTranslations('admin.booking_tour_suggestions')
  const tActions = useTranslations('admin.booking_actions')
  const locale = useLocale()
  const router = useRouter()

  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
        dateStyle: 'medium',
      }),
    [locale],
  )

  const filtered = useMemo(() => {
    if (filter === 'all') return suggestions
    if (filter === 'pending')
      return suggestions.filter((s) => s.reviewedAt === null)
    return suggestions.filter((s) => s.reviewedAt !== null)
  }, [filter, suggestions])

  function handleToggle(id: string, reviewed: boolean) {
    setBusy(id)
    startTransition(async () => {
      try {
        const result = await markSuggestionReviewedAction({
          suggestionId: id,
          reviewed,
        })
        if (!result.ok) {
          toast.error(tActions(`error_${result.error}` as 'error_db_failed'))
          return
        }
        toast.success(
          tActions(reviewed ? 'success_marked_reviewed' : 'success_marked_pending'),
        )
        router.refresh()
      } catch (err) {
        console.error('[TourSuggestionsTable/toggle]', err)
        toast.error(tActions('error_db_failed'))
      } finally {
        setBusy(null)
      }
    })
  }

  const columns: ColumnDef<TourSuggestionWithUser>[] = [
    {
      id: 'user',
      header: t('col_user'),
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-fg1">
            {row.original.userName || row.original.userEmail || '—'}
          </span>
          {row.original.userName && row.original.userEmail && (
            <span className="text-[11px] text-fg3">{row.original.userEmail}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'suggestedCity',
      header: t('col_city'),
      cell: ({ row }) => (
        <span className="text-fg1">{row.original.suggestedCity}</span>
      ),
    },
    {
      accessorKey: 'suggestedCountry',
      header: t('col_country'),
      cell: ({ row }) => (
        <span className="text-fg1">{row.original.suggestedCountry}</span>
      ),
    },
    {
      id: 'notes',
      header: t('col_notes'),
      enableSorting: false,
      cell: ({ row }) => {
        const notes = row.original.additionalNotes
        if (!notes) {
          return <span className="text-fg3">{t('notes_empty')}</span>
        }
        const truncated = truncate(notes, NOTES_TRUNCATE_LIMIT)
        return (
          <span
            className="text-[12px] text-fg2"
            title={notes}
          >
            {truncated}
          </span>
        )
      },
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
      id: 'status',
      header: t('col_status'),
      cell: ({ row }) => {
        const reviewed = row.original.reviewedAt !== null
        return (
          <StatusBadge
            status={reviewed ? 'COMPLETED' : 'PENDING'}
            tone={reviewed ? 'positive' : 'warning'}
            label={reviewed ? t('status_reviewed') : t('status_pending')}
          />
        )
      },
    },
    {
      id: 'actions',
      header: t('col_actions'),
      enableSorting: false,
      cell: ({ row }) => {
        const reviewed = row.original.reviewedAt !== null
        const Icon = reviewed ? RotateCcw : CheckCircle2
        const labelKey = reviewed ? 'unmark_reviewed' : 'mark_reviewed'
        return (
          <button
            type="button"
            disabled={busy === row.original.id}
            onClick={() => handleToggle(row.original.id, !reviewed)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-display font-semibold uppercase tracking-[0.06em] text-fg2 transition-colors hover:border-fg1 hover:text-fg1 disabled:opacity-60"
          >
            <Icon className="h-3 w-3" aria-hidden />
            {t(labelKey)}
          </button>
        )
      },
    },
  ]

  return (
    <>
      <FilterChips current={filter} onChange={setFilter} />
      <DataTable columns={columns} data={filtered} />
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
  const t = useTranslations('admin.booking_tour_suggestions')
  const items: { key: Filter; label: string }[] = [
    { key: 'all', label: t('filter_all') },
    { key: 'pending', label: t('filter_pending') },
    { key: 'reviewed', label: t('filter_reviewed') },
  ]
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-elevated p-1">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={cn(
            'rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.08em] font-display font-semibold transition-colors',
            current === item.key
              ? 'bg-fg1 text-bg'
              : 'text-fg3 hover:text-fg1',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
