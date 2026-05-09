'use client'

/**
 * Phase B1 — question history with segmented filter pills.
 *
 * Filter behaviour matches the design:
 *   - "all" excludes ARCHIVED (active queue view)
 *   - "pending" / "answered" / "archived" each return only that status
 *
 * Counts on the pills are computed from the full list, NOT the filtered view
 * — they're navigation hints, not search results.
 *
 * No edit / delete affordances. v1 is intake-only; admin (Phase B2) handles
 * status transitions. The "Yes I changed my mind" path is "submit a new
 * question" — documented in the prompt's edge-cases.
 */

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'motion/react'
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  EASE_EDITORIAL,
} from '@/lib/motion/variants'
import { QuestionCard } from './QuestionCard'
import { AskEmptyState } from './AskEmptyState'
import type { ClientUserQuestion } from './AskDrKhaledPage'

type Filter = 'all' | 'pending' | 'answered' | 'archived'

const FILTERS: ReadonlyArray<Filter> = [
  'all',
  'pending',
  'answered',
  'archived',
]

type Props = {
  locale: 'ar' | 'en'
  items: ClientUserQuestion[]
}

function toLocaleNumber(n: number, locale: 'ar' | 'en'): string {
  if (locale === 'ar') {
    return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d] ?? d)
  }
  return String(n)
}

export function QuestionList({ locale, items }: Props) {
  const t = useTranslations('dashboard.ask.list')
  const isRtl = locale === 'ar'
  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-arabic-display'

  const [filter, setFilter] = useState<Filter>('all')

  const counts = useMemo(
    () => ({
      all: items.length,
      pending: items.filter((q) => q.status === 'PENDING').length,
      answered: items.filter((q) => q.status === 'ANSWERED').length,
      archived: items.filter((q) => q.status === 'ARCHIVED').length,
    }),
    [items],
  )

  const filtered = useMemo(() => {
    if (filter === 'all') return items.filter((q) => q.status !== 'ARCHIVED')
    const target =
      filter === 'pending'
        ? 'PENDING'
        : filter === 'answered'
          ? 'ANSWERED'
          : 'ARCHIVED'
    return items.filter((q) => q.status === target)
  }, [items, filter])

  // Empty initial state — user has never submitted. The empty-this-filter
  // case (filter applied, but the user has at least one question) is
  // handled separately below.
  if (items.length === 0) {
    return (
      <section
        id="ask-history"
        className="border-t border-[var(--color-border)] pt-[clamp(48px,7vw,80px)] mt-[clamp(48px,7vw,80px)]"
      >
        <header className="grid grid-cols-1 gap-6 pb-6">
          <div className="flex flex-col gap-1.5">
            <span
              className={`text-[var(--color-fg3)] ${
                isRtl
                  ? 'font-arabic-body text-[13px] font-bold'
                  : 'font-display text-[11px] font-semibold uppercase tracking-[0.16em]'
              }`}
            >
              {t('eyebrow')}
            </span>
            <h2
              className={`m-0 text-[clamp(22px,2.5vw,28px)] font-bold leading-[1.2] tracking-[-0.005em] text-[var(--color-fg1)] ${fontDisplay} ${
                isRtl ? '' : '!tracking-[-0.015em]'
              }`}
            >
              {t('heading')}
            </h2>
            <p
              className={`m-0 text-[var(--color-fg3)] max-w-[56ch] ${
                isRtl
                  ? 'font-arabic-body text-[15px] leading-[1.7]'
                  : 'font-display text-[14px] leading-[1.5]'
              }`}
            >
              {t('subheading')}
            </p>
          </div>
        </header>
        <AskEmptyState locale={locale} />
      </section>
    )
  }

  return (
    <motion.section
      id="ask-history"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
      className="border-t border-[var(--color-border)] pt-[clamp(48px,7vw,80px)] mt-[clamp(48px,7vw,80px)]"
    >
      <header className="grid grid-cols-1 items-end gap-6 pb-6 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-1.5">
          <span
            className={`text-[var(--color-fg3)] ${
              isRtl
                ? 'font-arabic-body text-[13px] font-bold'
                : 'font-display text-[11px] font-semibold uppercase tracking-[0.16em]'
            }`}
          >
            {t('eyebrow')}
          </span>
          <h2
            className={`m-0 text-[clamp(22px,2.5vw,28px)] font-bold leading-[1.2] tracking-[-0.005em] text-[var(--color-fg1)] ${fontDisplay} ${
              isRtl ? '' : '!tracking-[-0.015em]'
            }`}
          >
            {t('heading')}
          </h2>
          <p
            className={`m-0 text-[var(--color-fg3)] max-w-[56ch] ${
              isRtl
                ? 'font-arabic-body text-[15px] leading-[1.7]'
                : 'font-display text-[14px] leading-[1.5]'
            }`}
          >
            {t('subheading')}
          </p>
        </div>

        {/* Segmented filter pills */}
        <div
          role="tablist"
          aria-label={t('filter_aria')}
          className="inline-flex gap-0.5 self-end rounded-full border border-[var(--color-border)] bg-[var(--color-bg-deep)] p-[3px]"
        >
          {FILTERS.map((key) => {
            const isActive = filter === key
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(key)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-0 px-3.5 py-1.5 text-[var(--color-fg2)] transition-[background-color,color,box-shadow] duration-200 hover:text-[var(--color-fg1)] ${
                  isActive
                    ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg1)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : ''
                } ${
                  isRtl
                    ? 'font-arabic-body text-[13px] font-bold'
                    : 'font-display text-[12px] font-semibold tracking-[0.02em]'
                }`}
              >
                {t(`filter_${key}`)}
                <span
                  className={`opacity-70 [font-feature-settings:'tnum'] ${
                    isRtl
                      ? 'font-arabic-body text-[12px]'
                      : 'font-display text-[11px] font-semibold'
                  }`}
                >
                  {toLocaleNumber(counts[key], locale)}
                </span>
              </button>
            )
          })}
        </div>
      </header>

      {filtered.length === 0 ? (
        <p
          className={`rounded-md border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] px-6 py-10 text-center text-[var(--color-fg3)] ${
            isRtl
              ? 'font-arabic-body text-[15px] leading-[1.7]'
              : 'font-display text-[14px] leading-[1.5]'
          }`}
        >
          {t('empty_filter')}
        </p>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="m-0 flex flex-col gap-4 p-0 list-none"
        >
          <AnimatePresence initial={false}>
            {filtered.map((q) => (
              <motion.li
                key={q.id}
                variants={staggerItem}
                layout
                className="list-none"
              >
                <QuestionCard locale={locale} question={q} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </motion.section>
  )
}
