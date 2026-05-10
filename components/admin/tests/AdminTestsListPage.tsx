'use client'

/**
 * Phase C2 — orchestrator for /admin/tests.
 *
 * Owns:
 *   - Search input (debounced, syncs to URL via router.replace).
 *   - Status filter pills (all / published / draft).
 *   - Category filter (segmented control).
 *   - Per-row publish + delete modal state.
 *
 * State updates push to URL so admins can bookmark / share filtered views.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  deleteTestAction,
  publishTestAction,
} from '@/app/[locale]/(admin)/admin/tests/actions'
import { TEST_CATEGORIES, type TestCategory } from '@/lib/validators/test'
import { TestsTable } from './TestsTable'
import { PublishTestModal } from './PublishTestModal'
import { DeleteTestModal } from './DeleteTestModal'
import { cn } from '@/lib/utils'

export type AdminTestRow = {
  id: string
  slug: string
  titleAr: string
  titleEn: string
  category: string
  isPublished: boolean
  questionCount: number
  attemptCount: number
  averageScore: number | null
  createdAt: string
}

type StatusFilter = 'all' | 'published' | 'draft'
type CategoryFilter = TestCategory | 'all'

type ActiveModal =
  | { type: 'publish'; row: AdminTestRow; next: boolean }
  | { type: 'delete'; row: AdminTestRow }
  | null

type Props = {
  rows: AdminTestRow[]
  locale: 'ar' | 'en'
  initialSearch: string
  initialStatus: StatusFilter
  initialCategory: CategoryFilter
}

export function AdminTestsListPage({
  rows,
  locale,
  initialSearch,
  initialStatus,
  initialCategory,
}: Props) {
  const t = useTranslations('admin.tests.list')
  const tCat = useTranslations('dashboard.ask.form')
  const tForms = useTranslations('admin.forms')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(initialSearch)
  const [active, setActive] = useState<ActiveModal>(null)
  const [pending, startTransition] = useTransition()

  // Debounce search — admins shouldn't fire a re-fetch on every keystroke.
  // 350ms feels responsive without thrashing the server. Mirrors the
  // booking-tours filter timing (which uses 300ms locally — close enough).
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setQuery = useCallback(
    (next: {
      search?: string
      status?: StatusFilter
      category?: CategoryFilter
    }) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next.search !== undefined) {
        if (next.search.trim()) params.set('search', next.search.trim())
        else params.delete('search')
      }
      if (next.status !== undefined) {
        if (next.status === 'all') params.delete('status')
        else params.set('status', next.status)
      }
      if (next.category !== undefined) {
        if (next.category === 'all') params.delete('category')
        else params.set('category', next.category)
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (searchValue !== initialSearch) setQuery({ search: searchValue })
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchValue, initialSearch, setQuery])

  const closeModal = useCallback(() => {
    if (!pending) setActive(null)
  }, [pending])

  const runPublish = useCallback(
    (row: AdminTestRow, next: boolean) => {
      startTransition(async () => {
        try {
          const res = await publishTestAction({ id: row.id, isPublished: next })
          if (res.ok) {
            toast.success(
              t(
                next
                  ? 'toast.publish_success'
                  : 'toast.unpublish_success',
              ),
            )
            setActive(null)
            router.refresh()
            return
          }
          if (res.error === 'no_questions') {
            toast.error(t('toast.error_no_questions'))
            return
          }
          if (res.error === 'not_found') {
            toast.error(t('toast.error_not_found'))
            setActive(null)
            return
          }
          if (res.error === 'unauthorized' || res.error === 'forbidden') {
            toast.error(tForms('error_forbidden'))
            return
          }
          toast.error(t('toast.error_generic'))
        } catch (err) {
          console.error('[AdminTestsListPage runPublish]', err)
          toast.error(t('toast.error_generic'))
        }
      })
    },
    [router, t, tForms],
  )

  const runDelete = useCallback(
    (row: AdminTestRow) => {
      startTransition(async () => {
        try {
          const res = await deleteTestAction({ id: row.id })
          if (res.ok) {
            toast.success(t('toast.delete_success'))
            setActive(null)
            router.refresh()
            return
          }
          if (res.error === 'unauthorized' || res.error === 'forbidden') {
            toast.error(tForms('error_forbidden'))
            return
          }
          toast.error(t('toast.error_generic'))
        } catch (err) {
          console.error('[AdminTestsListPage runDelete]', err)
          toast.error(t('toast.error_generic'))
        }
      })
    },
    [router, t, tForms],
  )

  const statuses: ReadonlyArray<StatusFilter> = ['all', 'published', 'draft']
  const categories: ReadonlyArray<CategoryFilter> = ['all', ...TEST_CATEGORIES]

  // Local counts off the server-shipped rows so the pill labels feel live
  // without a second server query. Status filter, by contrast, drives the
  // server query — so the visible row count for the active filter equals
  // rows.length already.
  const statusCounts = useMemo(() => {
    const total = rows.length
    const published = rows.filter((r) => r.isPublished).length
    return { all: total, published, draft: total - published }
  }, [rows])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative inline-flex items-center">
          <Search
            className="pointer-events-none absolute start-2.5 h-3.5 w-3.5 text-fg3"
            aria-hidden
          />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={t('search_placeholder')}
            className="h-9 min-w-[260px] rounded-full border border-border bg-bg-elevated ps-8 pe-4 text-[13px] text-fg1 placeholder:text-fg3 focus:border-accent focus:outline-none"
          />
        </label>
        <div
          role="group"
          aria-label={t('filter.status_aria')}
          className="flex flex-wrap items-center gap-2"
        >
          {statuses.map((s) => {
            const isActive = initialStatus === s
            const count =
              s === 'all'
                ? statusCounts.all
                : s === 'published'
                  ? statusCounts.published
                  : statusCounts.draft
            return (
              <button
                key={s}
                type="button"
                aria-pressed={isActive}
                onClick={() => setQuery({ status: s })}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-display font-semibold uppercase tracking-[0.06em] transition-colors',
                  isActive
                    ? 'border-fg1 bg-fg1 text-bg'
                    : 'border-border text-fg3 hover:bg-bg-deep',
                )}
              >
                <span>{t(`filter.status_${s}` as 'filter.status_all')}</span>
                <span
                  className={cn(
                    'inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] [font-feature-settings:\'tnum\']',
                    isActive ? 'bg-bg/20 text-bg' : 'bg-bg-deep text-fg3',
                  )}
                  aria-hidden
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
          {t('filter.category_label')}
        </span>
        {categories.map((c) => {
          const isActive = initialCategory === c
          return (
            <button
              key={c}
              type="button"
              aria-pressed={isActive}
              onClick={() => setQuery({ category: c })}
              className={cn(
                'rounded-full border px-3 py-1 text-[11px] font-display font-semibold uppercase tracking-[0.06em] transition-colors',
                isActive
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-border text-fg3 hover:bg-bg-deep',
              )}
            >
              {c === 'all'
                ? t('filter.status_all')
                : tCat(`category_${c}` as 'category_general')}
            </button>
          )
        })}
      </div>

      <TestsTable
        rows={rows}
        locale={locale}
        onPublish={(row, next) => setActive({ type: 'publish', row, next })}
        onDelete={(row) => setActive({ type: 'delete', row })}
      />

      {active?.type === 'publish' && (
        <PublishTestModal
          row={active.row}
          next={active.next}
          locale={locale}
          pending={pending}
          onConfirm={() => runPublish(active.row, active.next)}
          onClose={closeModal}
        />
      )}
      {active?.type === 'delete' && (
        <DeleteTestModal
          row={active.row}
          locale={locale}
          pending={pending}
          onConfirm={() => runDelete(active.row)}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
