'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { LibraryCard, type LibraryItem } from './LibraryCard'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

type Filter = 'all' | 'books' | 'lectures'

export function LibraryView({ items: initialItems = [] }: { items?: LibraryItem[] }) {
  const t = useTranslations('dashboard.library')
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
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] p-[clamp(40px,6vw,80px)] text-center">
          <h2
            className={`m-0 mb-3 text-[20px] font-bold text-[var(--color-fg1)] ${
              isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.01em]'
            }`}
          >
            {t('empty_title')}
          </h2>
          <p
            className={`m-0 mb-6 max-w-[400px] mx-auto text-[15px] leading-[1.6] text-[var(--color-fg2)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('empty_text')}
          </p>
          <Link href="/books" className="btn-pill btn-pill-primary">
            {t('browse')}
          </Link>
        </div>
      )}
    </div>
  )
}
