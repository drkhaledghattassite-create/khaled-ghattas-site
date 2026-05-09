'use client'

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { BookOpen } from 'lucide-react'
import { Link, usePathname, useRouter } from '@/lib/i18n/navigation'
import { useReducedMotion } from '@/lib/motion/hooks'
import { LibraryCard, type LibraryItem } from './LibraryCard'
import {
  ContinueReadingHero,
  type HeroActivity,
} from './ContinueReadingHero'
import {
  LibrarySortDropdown,
  type LibrarySort,
} from './LibrarySortDropdown'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

// External URL param taxonomy ↔ internal item.type mapping.
//   ?type=books    → BOOK
//   ?type=sessions → LECTURE  (legacy internal name; LibraryCard still uses BOOK|LECTURE)
//   anything else  → 'all'
type Filter = 'all' | 'BOOK' | 'LECTURE'

const ALLOWED_SORTS: readonly LibrarySort[] = [
  'recent_read',
  'recent_purchase',
  'title_az',
]

function parseFilter(raw: string | null): Filter {
  if (raw === 'books') return 'BOOK'
  if (raw === 'sessions') return 'LECTURE'
  return 'all'
}

function parseSort(
  raw: string | null,
  hasAnyProgress: boolean,
): LibrarySort {
  if (raw && (ALLOWED_SORTS as readonly string[]).includes(raw)) {
    return raw as LibrarySort
  }
  // Edge case (b): user has items but none have progress — "Recently
  // read" would be meaningless, so default to "Recently purchased".
  return hasAnyProgress ? 'recent_read' : 'recent_purchase'
}

export function LibraryView({
  items: initialItems = [],
  activity = null,
}: {
  items?: LibraryItem[]
  /**
   * Phase 5 — unified continue-activity. Server picks the most-recent
   * BOOK or SESSION item via `getMostRecentActivity`; the hero card
   * renders whichever (or hides when null). The legacy client-side
   * `pickHeroCandidate` is gone — that helper was BOOK-only and didn't
   * see Phase 4 media progress.
   */
  activity?: HeroActivity | null
}) {
  const t = useTranslations('dashboard.library')
  const tLib = useTranslations('library')
  const tFilter = useTranslations('library.filter')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const reduceMotion = useReducedMotion()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'
  const fontDisplay = 'font-arabic-display'

  // Derived state from URL params (single source of truth — refresh-safe,
  // shareable, browser-back-friendly).
  const filter: Filter = parseFilter(searchParams.get('type'))
  const hasAnyProgress = useMemo(
    () => initialItems.some((i) => i.lastReadAt != null),
    [initialItems],
  )
  const sort: LibrarySort = parseSort(
    searchParams.get('sort'),
    hasAnyProgress,
  )

  // Counts used to decide which filter chips to render.
  const counts = useMemo(() => {
    let books = 0
    let lectures = 0
    for (const it of initialItems) {
      if (it.type === 'BOOK') books++
      else lectures++
    }
    return { books, lectures, total: initialItems.length }
  }, [initialItems])

  const updateParam = useCallback(
    (key: 'type' | 'sort', value: string | null) => {
      const next = new URLSearchParams(searchParams.toString())
      if (value === null) next.delete(key)
      else next.set(key, value)
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  // Filter then sort. Sorting is locale-aware for titles (Arabic vs Latin
  // collation) — see Title A-Z sort below. lastReadAt-based sort puts
  // never-read items at the bottom by purchase date, per spec.
  const visibleItems = useMemo(() => {
    let arr = initialItems
    if (filter === 'BOOK') arr = arr.filter((i) => i.type === 'BOOK')
    else if (filter === 'LECTURE')
      arr = arr.filter((i) => i.type === 'LECTURE')

    const sorted = [...arr]
    if (sort === 'recent_read') {
      sorted.sort((a, b) => {
        const aTs = a.lastReadAt ? Date.parse(a.lastReadAt) : -1
        const bTs = b.lastReadAt ? Date.parse(b.lastReadAt) : -1
        if (aTs !== bTs) return bTs - aTs
        // Tiebreak: never-read items, or equal lastReadAt, fall back
        // to most-recently-purchased.
        return Date.parse(b.purchasedAt) - Date.parse(a.purchasedAt)
      })
    } else if (sort === 'recent_purchase') {
      sorted.sort(
        (a, b) => Date.parse(b.purchasedAt) - Date.parse(a.purchasedAt),
      )
    } else {
      // title_az — locale-aware compare. `sensitivity: 'base'` ignores
      // case + diacritics, which is the right call for both Arabic and
      // Latin alphabetical browsing.
      sorted.sort((a, b) => {
        const aTitle = isRtl ? a.titleAr : a.titleEn
        const bTitle = isRtl ? b.titleAr : b.titleEn
        return aTitle.localeCompare(bTitle, locale, { sensitivity: 'base' })
      })
    }
    return sorted
  }, [filter, initialItems, isRtl, locale, sort])

  // Filter chip definitions — only render chips for types the user owns.
  // "All" is always shown when at least one type chip is also visible.
  const filterChips: { key: Filter; param: string | null; label: string }[] = []
  filterChips.push({ key: 'all', param: null, label: tFilter('all') })
  if (counts.books > 0) {
    filterChips.push({ key: 'BOOK', param: 'books', label: tFilter('books') })
  }
  if (counts.lectures > 0) {
    filterChips.push({
      key: 'LECTURE',
      param: 'sessions',
      label: tFilter('sessions'),
    })
  }
  // Edge case: user owns only one type. Show only "All" chip then — having
  // a second redundant chip would be visual noise.
  const showFilterChips = filterChips.length > 1

  // Empty state — zero items at all.
  if (counts.total === 0) {
    return (
      <div className="flex flex-col gap-[clamp(32px,4vw,56px)]">
        <motion.header
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex flex-col gap-3"
        >
          <span
            className={`text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)] ${
              isRtl
                ? `${fontBody} !text-[14px] !tracking-normal !normal-case !font-bold`
                : 'font-display'
            }`}
          >
            {t('eyebrow')}
          </span>
          <h1
            className={`m-0 text-[clamp(28px,3.6vw,42px)] leading-[1.1] font-bold tracking-[-0.02em] text-[var(--color-fg1)] ${fontDisplay}`}
          >
            {t('heading')}
          </h1>
        </motion.header>
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
          className="flex min-h-[420px] flex-col items-center justify-center px-4 py-[clamp(40px,6vw,80px)] text-center"
        >
          <div
            className="mb-7 inline-flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
            aria-hidden="true"
          >
            <BookOpen className="h-9 w-9" strokeWidth={1.5} />
          </div>
          <h2
            className={`m-0 mb-4 text-[clamp(24px,3.2vw,32px)] leading-[1.15] font-bold tracking-[-0.015em] text-[var(--color-fg1)] ${fontDisplay}`}
          >
            {tLib('empty.title')}
          </h2>
          <p
            className={`m-0 mb-9 max-w-[480px] text-[16px] leading-[1.7] text-[var(--color-fg2)] ${fontBody}`}
          >
            {tLib('empty.body')}
          </p>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link
              href="/books"
              className={`btn-pill btn-pill-primary inline-flex justify-center !text-[14px] !py-2.5 !px-6 ${fontBody}`}
            >
              {tLib('empty.cta_books')}
            </Link>
            {/* Sessions are sold under /books with productType=SESSION; there
                is no separate public sessions route. The query hint is
                forward-compatible if BooksGrid ever honors URL params. */}
            <Link
              href="/books?type=SESSION"
              className={`btn-pill btn-pill-secondary inline-flex justify-center !text-[14px] !py-2.5 !px-6 ${fontBody}`}
            >
              {tLib('empty.cta_sessions')}
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[clamp(28px,3.5vw,48px)]">
      {/* Header */}
      <motion.header
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex flex-col gap-3"
      >
        <span
          className={`text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)] ${
            isRtl
              ? `${fontBody} !text-[14px] !tracking-normal !normal-case !font-bold`
              : 'font-display'
          }`}
        >
          {t('eyebrow')}
        </span>
        <h1
          className={`m-0 text-[clamp(28px,3.6vw,42px)] leading-[1.1] font-bold tracking-[-0.02em] text-[var(--color-fg1)] ${fontDisplay}`}
        >
          {t('heading')}
        </h1>
        <p
          className={`m-0 max-w-[520px] text-[16px] leading-[1.55] text-[var(--color-fg2)] ${fontBody}`}
        >
          {t('subheading')}
        </p>
      </motion.header>

      {/* Continue activity hero — BOOK or SESSION, picked server-side. */}
      {activity && <ContinueReadingHero activity={activity} />}

      {/* Filter chips + sort row.
          Filter chips on leading edge, sort dropdown on trailing edge. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showFilterChips ? (
          <div role="tablist" className="flex flex-wrap items-center gap-2">
            {filterChips.map((chip) => {
              const active = filter === chip.key
              return (
                <button
                  key={chip.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => updateParam('type', chip.param)}
                  className={`inline-flex items-center px-4 py-2 rounded-full text-[13px] font-semibold border transition-colors ${
                    active
                      ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] border-[var(--color-accent)]'
                      : 'bg-[var(--color-bg-elevated)] text-[var(--color-fg2)] border-[var(--color-border-strong)] hover:text-[var(--color-fg1)] hover:border-[var(--color-fg1)]'
                  } ${fontBody}`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        ) : (
          // Reserve the chip-row leading slot so the sort dropdown stays
          // on the trailing edge instead of jumping to the leading edge.
          <span aria-hidden />
        )}
        <LibrarySortDropdown
          value={sort}
          onChange={(next) => updateParam('sort', next)}
        />
      </div>

      {/* Cards grid */}
      {visibleItems.length > 0 ? (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
          className="grid gap-4 sm:gap-5 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visibleItems.map((item) => (
            <LibraryCard key={item.id} item={item} />
          ))}
        </motion.div>
      ) : (
        // Filter narrowed to zero. Don't render the big empty state
        // (the user does have items, just none in this filter); a small
        // inline note is sufficient.
        <p
          className={`m-0 px-2 py-8 text-center text-[14px] text-[var(--color-fg3)] ${fontBody}`}
        >
          {tLib('empty.body')}
        </p>
      )}
    </div>
  )
}
