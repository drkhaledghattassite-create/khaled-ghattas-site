'use client'

import { useMemo, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { CheckCircle2, RotateCcw, X } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'
import {
  bulkMarkInterestContactedAction,
  markInterestContactedAction,
} from '@/app/[locale]/(admin)/admin/booking/actions'
import type { BookingInterestWithMeta } from '@/lib/db/queries'

type Filter = 'all' | 'pending' | 'contacted'

const NOTES_TRUNCATE_LIMIT = 80

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value
  return `${value.slice(0, limit).trimEnd()}…`
}

export function BookingInterestTable({
  interests,
}: {
  interests: BookingInterestWithMeta[]
}) {
  const t = useTranslations('admin.booking_interest')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.booking_actions')
  const locale = useLocale()
  const router = useRouter()

  const [filter, setFilter] = useState<Filter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [pendingBulk, setPendingBulk] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [, startTransition] = useTransition()

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
        dateStyle: 'medium',
      }),
    [locale],
  )

  const filtered = useMemo(() => {
    if (filter === 'all') return interests
    if (filter === 'pending')
      return interests.filter((i) => i.contactedAt === null)
    return interests.filter((i) => i.contactedAt !== null)
  }, [filter, interests])

  function toggleRow(id: string, next: boolean) {
    setSelectedIds((prev) => {
      const updated = new Set(prev)
      if (next) updated.add(id)
      else updated.delete(id)
      return updated
    })
  }

  function toggleAllVisible(next: boolean) {
    setSelectedIds((prev) => {
      if (!next) {
        // Drop only the currently-visible ids; preserves selections on
        // hidden rows (rare but harmless if filter changes mid-action).
        const updated = new Set(prev)
        for (const i of filtered) updated.delete(i.id)
        return updated
      }
      const updated = new Set(prev)
      for (const i of filtered) updated.add(i.id)
      return updated
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function handleToggle(id: string, contacted: boolean) {
    setBusy(id)
    startTransition(async () => {
      try {
        const result = await markInterestContactedAction({
          interestId: id,
          contacted,
        })
        if (!result.ok) {
          toast.error(tActions(`error_${result.error}` as 'error_db_failed'))
          return
        }
        toast.success(
          tActions(
            contacted ? 'success_marked_contacted' : 'success_marked_pending',
          ),
        )
        router.refresh()
      } catch (err) {
        console.error('[BookingInterestTable/toggle]', err)
        toast.error(tActions('error_db_failed'))
      } finally {
        setBusy(null)
      }
    })
  }

  async function handleBulk() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkBusy(true)
    try {
      const result = await bulkMarkInterestContactedAction({
        interestIds: ids,
        contacted: true,
      })
      if (!result.ok) {
        toast.error(tActions(`error_${result.error}` as 'error_db_failed'))
        return
      }
      toast.success(tActions('success_bulk_contacted', { count: result.count }))
      setSelectedIds(new Set())
      setPendingBulk(false)
      router.refresh()
    } catch (err) {
      console.error('[BookingInterestTable/bulk]', err)
      toast.error(tActions('error_db_failed'))
    } finally {
      setBulkBusy(false)
    }
  }

  // Visible-row selection state for the header checkbox: all selected =
  // every visible row is in the set; none = no overlap; otherwise indeterminate.
  const visibleAllSelected =
    filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id))

  const items: { key: Filter; label: string }[] = [
    { key: 'all', label: t('filter_all') },
    { key: 'pending', label: t('filter_pending') },
    { key: 'contacted', label: t('filter_contacted') },
  ]

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-elevated p-1">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.08em] font-display font-semibold transition-colors',
                  filter === item.key
                    ? 'bg-fg1 text-bg'
                    : 'text-fg3 hover:text-fg1',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-accent-soft px-4 py-2.5">
            <span className="text-[12px] font-display font-semibold text-accent">
              {t('bulk_selected', { count: selectedIds.size })}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingBulk(true)}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1.5 rounded-full border border-fg1 bg-fg1 px-3 py-1 text-[11px] font-display font-semibold uppercase tracking-[0.08em] text-bg transition-colors hover:bg-accent hover:border-accent hover:text-accent-fg disabled:opacity-60"
              >
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                {t('bulk_mark_contacted')}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated px-3 py-1 text-[11px] font-display font-semibold uppercase tracking-[0.08em] text-fg2 transition-colors hover:border-fg1 hover:text-fg1 disabled:opacity-60"
              >
                <X className="h-3 w-3" aria-hidden />
                {t('bulk_clear_selection')}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-md border border-border bg-bg-elevated">
          <table className="w-full">
            <thead className="border-b border-border bg-bg-deep">
              <tr>
                <th className="w-10 px-3 py-2.5 text-start">
                  <Checkbox
                    checked={visibleAllSelected}
                    onCheckedChange={(v) => toggleAllVisible(!!v)}
                    aria-label={t('bulk_select')}
                  />
                </th>
                <th className="px-3 py-2.5 text-start text-[10px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
                  {t('col_user')}
                </th>
                <th className="px-3 py-2.5 text-start text-[10px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
                  {t('col_booking')}
                </th>
                <th className="px-3 py-2.5 text-start text-[10px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
                  {t('col_notes')}
                </th>
                <th className="px-3 py-2.5 text-start text-[10px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
                  {t('col_created_at')}
                </th>
                <th className="px-3 py-2.5 text-start text-[10px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
                  {t('col_status')}
                </th>
                <th className="px-3 py-2.5 text-start text-[10px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
                  {t('col_actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-fg3 font-display"
                  >
                    {t('empty_title')}
                  </td>
                </tr>
              ) : (
                filtered.map((interest) => {
                  const contacted = interest.contactedAt !== null
                  const selected = selectedIds.has(interest.id)
                  const title =
                    locale === 'ar'
                      ? interest.bookingTitleAr
                      : interest.bookingTitleEn
                  const Icon = contacted ? RotateCcw : CheckCircle2
                  return (
                    <tr
                      key={interest.id}
                      className={cn(
                        'border-t border-border transition-colors',
                        selected ? 'bg-accent-soft' : 'hover:bg-bg-deep',
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(v) =>
                            toggleRow(interest.id, !!v)
                          }
                          aria-label={t('bulk_select')}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-[13px]">
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-fg1">
                            {interest.userName ||
                              interest.userEmail ||
                              '—'}
                          </span>
                          {interest.userName && interest.userEmail && (
                            <span className="text-[11px] text-fg3">
                              {interest.userEmail}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-fg1">
                        {title || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-fg2">
                        {interest.additionalNotes ? (
                          <span title={interest.additionalNotes}>
                            {truncate(
                              interest.additionalNotes,
                              NOTES_TRUNCATE_LIMIT,
                            )}
                          </span>
                        ) : (
                          <span className="text-fg3">{t('notes_empty')}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-fg1">
                        <span className={cn(locale === 'en' && 'num-latn')}>
                          {dateFmt.format(interest.createdAt)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          status={contacted ? 'COMPLETED' : 'PENDING'}
                          tone={contacted ? 'positive' : 'warning'}
                          label={
                            contacted
                              ? t('status_contacted')
                              : t('status_pending')
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          disabled={busy === interest.id}
                          onClick={() =>
                            handleToggle(interest.id, !contacted)
                          }
                          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-display font-semibold uppercase tracking-[0.06em] text-fg2 transition-colors hover:border-fg1 hover:text-fg1 disabled:opacity-60"
                        >
                          <Icon className="h-3 w-3" aria-hidden />
                          {contacted
                            ? t('unmark_contacted')
                            : t('mark_contacted')}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog
        open={pendingBulk}
        onOpenChange={(open) => !open && !bulkBusy && setPendingBulk(false)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('bulk_confirm_title', { count: selectedIds.size })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('bulk_confirm_body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>
              {tForms('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleBulk} disabled={bulkBusy}>
              {t('bulk_confirm_action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
