'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { BookOpen } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { LibraryCard, type LibraryItem } from './LibraryCard'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

type Filter = 'all' | 'books' | 'lectures'

export function LibraryView({ items: initialItems = [] }: { items?: LibraryItem[] }) {
  const t = useTranslations('dashboard.library')
  // Phase 1 introduced a parallel `library.*` namespace whose keys are the
  // primary source of truth for empty-state and download copy. Header copy
  // (eyebrow/heading/subheading/filters) still comes from the legacy
  // `dashboard.library.*` namespace which Phase 1 did not touch.
  const tLib = useTranslations('library')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [filter, setFilter] = useState<Filter>('all')

  const items = initialItems.filter((item) => {
    if (filter === 'books') return item.type === 'BOOK'
    if (filter === 'lectures') return item.type === 'LECTURE'
    return true
  })

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('filter.all') },
    { key: 'books', label: t('filter.books') },
    { key: 'lectures', label: t('filter.lectures') },
  ]

  return (
    <div className="flex flex-col gap-[clamp(32px,4vw,56px)]">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex flex-col gap-3"
      >
        <span
          className={`text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)] ${
            isRtl ? 'font-arabic-body !text-[14px] !tracking-normal !normal-case !font-bold' : 'font-display'
          }`}
        >
          {t('eyebrow')}
        </span>
        <h1
          className={`m-0 text-[clamp(28px,3.6vw,42px)] leading-[1.1] font-bold tracking-[-0.02em] text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display'
          }`}
        >
          {t('heading')}
        </h1>
        <p
          className={`m-0 max-w-[520px] text-[16px] leading-[1.55] text-[var(--color-fg2)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('subheading')}
        </p>
      </motion.header>

      {/* Filter pills */}
      <div role="tablist" className="flex flex-wrap items-center gap-2">
        {filters.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center px-4 py-2 rounded-full text-[13px] font-semibold border transition-colors ${
                active
                  ? 'bg-[var(--color-fg1)] text-[var(--color-bg)] border-[var(--color-fg1)]'
                  : 'bg-transparent text-[var(--color-fg2)] border-[var(--color-border-strong)] hover:text-[var(--color-fg1)] hover:border-[var(--color-fg1)]'
              } ${isRtl ? 'font-arabic-body' : 'font-display'}`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Cards grid */}
      {items.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item) => (
            <LibraryCard key={item.id} item={item} />
          ))}
        </motion.div>
      ) : (
        // Mirrors the UnavailableNotice on /dashboard/library/read/[bookId]:
        // no dashed-border card (it read as "forgotten placeholder"), accent-
        // tinted icon badge + centred content, modest min-height so the
        // empty state has presence without making the page comically tall.
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
          className="flex min-h-[400px] flex-col items-center justify-center px-4 py-[clamp(32px,5vw,64px)] text-center"
        >
          <div
            className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
            aria-hidden="true"
          >
            <BookOpen className="h-7 w-7" strokeWidth={1.6} />
          </div>
          <h2
            className={`m-0 mb-3 text-[clamp(22px,3vw,30px)] leading-[1.15] font-bold tracking-[-0.015em] text-[var(--color-fg1)] ${
              isRtl ? 'font-arabic-display' : 'font-arabic-display'
            }`}
          >
            {tLib('empty.title')}
          </h2>
          <p
            className={`m-0 mb-8 max-w-[440px] text-[16px] leading-[1.7] text-[var(--color-fg2)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {tLib('empty.body')}
          </p>
          <Link
            href="/books"
            className={`btn-pill btn-pill-primary inline-flex !text-[14px] !py-2.5 !px-5 ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {tLib('empty.cta')}
          </Link>
        </motion.div>
      )}
    </div>
  )
}
