'use client'

/**
 * Phase C1 — public catalog at /tests.
 *
 * Editorial hero on the leading column with a small signed note from Dr.
 * Khaled on the trailing column. Below, a category-pill row drives URL
 * state (router.replace so refresh preserves the filter). Cards link to
 * /tests/[slug]; the "Taken" badge shows when the user has at least one
 * attempt against the test.
 */

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Clock, ListChecks } from 'lucide-react'
import { Link, useRouter, usePathname } from '@/lib/i18n/navigation'
import {
  EASE_EDITORIAL,
  fadeUp,
  staggerContainer,
  staggerItem,
} from '@/lib/motion/variants'
import {
  TEST_CATEGORIES,
  type TestCategory,
} from '@/lib/validators/test'
import type { TestWithQuestionCount } from '@/lib/db/queries'

type Props = {
  locale: 'ar' | 'en'
  tests: TestWithQuestionCount[]
  takenTestIds: string[]
  activeCategory: TestCategory | 'all'
}

const CATEGORY_FILTERS = ['all', ...TEST_CATEGORIES] as const
type CatalogFilter = (typeof CATEGORY_FILTERS)[number]

function toArDigits(n: number) {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}

function fmtNum(n: number, locale: 'ar' | 'en') {
  return locale === 'ar' ? toArDigits(n) : String(n)
}

export function TestsCatalogPage({
  locale,
  tests,
  takenTestIds,
  activeCategory,
}: Props) {
  const t = useTranslations('tests')
  const router = useRouter()
  const pathname = usePathname()
  const isRtl = locale === 'ar'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'
  const Arrow = isRtl ? ArrowLeft : ArrowRight

  const [pending, startTransition] = useTransition()

  const takenSet = new Set(takenTestIds)

  const counts: Record<CatalogFilter, number> = {
    all: tests.length,
    psychology: 0,
    education: 0,
    relationships: 0,
    society: 0,
    career: 0,
    general: 0,
  }
  for (const test of tests) {
    if ((CATEGORY_FILTERS as readonly string[]).includes(test.category)) {
      counts[test.category as CatalogFilter] += 1
    }
  }

  const onFilterClick = (next: CatalogFilter) => {
    const params = new URLSearchParams()
    if (next !== 'all') params.set('category', next)
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  const isEmpty = tests.length === 0

  return (
    <div className="bg-[var(--color-bg)]">
      <div className="mx-auto max-w-[var(--container-max)] [padding-inline:clamp(20px,5vw,56px)]">
        {/* Hero */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
          className="grid items-stretch gap-10 [padding-block:clamp(56px,7vw,96px)] border-b border-[var(--color-border)] md:grid-cols-[1.4fr_1fr] md:gap-[clamp(40px,6vw,96px)]"
        >
          <div className="flex max-w-[60ch] flex-col justify-center gap-6">
            <span
              className={`inline-flex items-center gap-2.5 text-[13px] font-bold text-[var(--color-accent)] ${
                isRtl
                  ? 'font-arabic-body'
                  : 'font-display !text-[11px] !uppercase tracking-[0.16em]'
              }`}
            >
              <span aria-hidden className="inline-block h-px w-6 bg-[var(--color-accent)]" />
              {t('hero.eyebrow')}
            </span>
            <h1
              className={`m-0 text-[clamp(36px,5.5vw,64px)] leading-[1.1] tracking-[-0.01em] text-[var(--color-fg1)] [text-wrap:balance] ${
                isRtl ? 'font-arabic-display' : 'font-display !tracking-[-0.025em]'
              }`}
            >
              {t.rich('hero.title', {
                em: (chunks) => (
                  <em className="not-italic text-[var(--color-accent)]">{chunks}</em>
                ),
              })}
            </h1>
            <p
              className={`max-w-[56ch] text-[17px] leading-[1.85] text-[var(--color-fg2)] ${fontBody}`}
            >
              {t('hero.body_a')}
            </p>
            <p
              className={`max-w-[56ch] text-[17px] leading-[1.85] text-[var(--color-fg2)] ${fontBody}`}
            >
              {t('hero.body_b')}
            </p>
            {!isEmpty && (
              <div
                className={`mt-2 flex flex-wrap items-center gap-[18px] border-t border-[var(--color-border)] pt-3.5 text-[13px] text-[var(--color-fg3)] ${
                  isRtl ? 'font-arabic-body !text-[14px]' : 'font-display'
                }`}
              >
                <span>
                  <strong className="font-bold text-[var(--color-fg1)]">
                    {t('landing.count_tests', {
                      count: fmtNum(tests.length, locale),
                    })}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Signed note from Dr. Khaled */}
          <aside className="relative flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-[clamp(24px,3vw,36px)] shadow-[var(--shadow-card)]">
            <span
              aria-hidden
              className="absolute top-[-1px] start-[clamp(24px,3vw,36px)] block h-[3px] w-12 bg-[var(--color-accent)]"
            />
            <div className="flex items-center gap-3.5">
              <span
                aria-hidden
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-accent-soft)] text-[15px] font-bold text-[var(--color-accent)]"
              >
                {isRtl ? 'خ' : 'K'}
              </span>
              <div>
                <strong
                  className={`block text-[15px] font-bold text-[var(--color-fg1)] ${
                    isRtl ? 'font-arabic-display' : 'font-display !tracking-[-0.01em]'
                  }`}
                >
                  {t('hero.note_name')}
                </strong>
                <span className="text-[12.5px] text-[var(--color-fg3)]">
                  {t('hero.note_role')}
                </span>
              </div>
            </div>
            <p
              className={`text-[16px] leading-[1.85] text-[var(--color-fg2)] ${
                isRtl
                  ? 'font-arabic-body'
                  : 'font-display !text-[15px] !leading-[1.7]'
              }`}
            >
              {t('hero.note_body')}
            </p>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-[12.5px] text-[var(--color-fg3)]">
              <span
                className={`text-[14px] font-semibold text-[var(--color-fg1)] ${
                  isRtl ? 'font-arabic-display' : 'font-display italic'
                }`}
              >
                {t('hero.note_sig')}
              </span>
            </div>
          </aside>
        </motion.section>

        {/* Filter pills */}
        {!isEmpty && (
          <div className="flex flex-wrap items-center justify-between gap-6 [padding-block:clamp(28px,4vw,40px)]">
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label={t('catalog.filter_aria')}
              data-pending={pending ? 'true' : undefined}
            >
              {CATEGORY_FILTERS.map((filter) => {
                const active = activeCategory === filter
                const count = counts[filter]
                if (filter !== 'all' && count === 0) return null
                return (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onFilterClick(filter)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all duration-200 ${
                      active
                        ? 'border-[var(--color-fg1)] bg-[var(--color-fg1)] text-[var(--color-bg)]'
                        : 'border-[var(--color-border-strong)] bg-transparent text-[var(--color-fg2)] hover:border-[var(--color-fg1)] hover:text-[var(--color-fg1)]'
                    } ${
                      isRtl
                        ? 'font-arabic-body !text-[14px] !font-bold'
                        : 'font-display'
                    }`}
                  >
                    <span>
                      {filter === 'all' ? t('catalog.filter_all') : t(`landing.category_${filter}`)}
                    </span>
                    <span className="text-[11px] opacity-60 [font-feature-settings:'tnum']">
                      {fmtNum(count, locale)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty / Catalog */}
        {isEmpty ? (
          <div className="my-8 flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] [padding:clamp(56px,8vw,96px)_clamp(20px,4vw,40px)] text-center">
            <h2
              className={`m-0 text-[22px] font-bold text-[var(--color-fg1)] ${
                isRtl ? 'font-arabic-display' : 'font-display !tracking-[-0.015em]'
              }`}
            >
              {t('catalog.empty_title')}
            </h2>
            <p
              className={`m-0 max-w-[44ch] text-[15px] leading-[1.7] text-[var(--color-fg2)] ${
                isRtl ? 'font-arabic-body !text-[16px] !leading-[1.85]' : 'font-display'
              }`}
            >
              {t('catalog.empty_body')}
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 pb-24 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
          >
            {tests.map((test) => {
              const taken = takenSet.has(test.id)
              const title = locale === 'ar' ? test.titleAr : test.titleEn
              const desc = locale === 'ar' ? test.descriptionAr : test.descriptionEn
              const ctaLabel = taken
                ? t('card.take_again')
                : t('card.start')
              return (
                <motion.div key={test.id} variants={staggerItem}>
                  <Link
                    href={`/tests/${test.slug}`}
                    className="group relative flex h-full min-h-[240px] flex-col gap-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-[clamp(22px,2.5vw,32px)] shadow-[var(--shadow-card)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lift)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] bg-[var(--color-accent-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-accent)] ${
                          isRtl
                            ? 'font-arabic-body !text-[12px] !normal-case !tracking-normal !font-bold'
                            : 'font-display'
                        }`}
                      >
                        {t(`landing.category_${test.category}` as 'landing.category_general')}
                      </span>
                      {taken && (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-deep)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-fg2)] before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-current ${
                            isRtl ? 'font-arabic-body !text-[12px] !normal-case !tracking-normal' : 'font-display'
                          }`}
                        >
                          {t('card.taken')}
                        </span>
                      )}
                    </div>
                    <h3
                      className={`m-0 flex-1 text-[clamp(20px,1.6vw,24px)] font-bold leading-[1.25] text-[var(--color-fg1)] [text-wrap:balance] ${
                        isRtl
                          ? 'font-arabic-display'
                          : 'font-display !tracking-[-0.015em]'
                      }`}
                    >
                      {title}
                    </h3>
                    <p
                      className={`m-0 line-clamp-2 text-[15px] leading-[1.7] text-[var(--color-fg2)] ${
                        isRtl
                          ? 'font-arabic-body'
                          : 'font-display !text-[14px] !leading-[1.6]'
                      }`}
                    >
                      {desc}
                    </p>
                    <div
                      className={`flex flex-wrap items-center gap-2.5 border-t border-[var(--color-border)] pt-3 text-[12.5px] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${
                        isRtl ? 'font-arabic-body !text-[13px]' : 'font-display'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <ListChecks aria-hidden className="h-[13px] w-[13px]" />
                        {t('card.questions_count', {
                          count: fmtNum(test.questionCount, locale),
                        })}
                      </span>
                      <span aria-hidden className="inline-block h-[3px] w-[3px] rounded-full bg-[var(--color-border-strong)]" />
                      <span className="inline-flex items-center gap-1.5">
                        <Clock aria-hidden className="h-[13px] w-[13px]" />
                        {t('card.estimated_minutes', {
                          minutes: fmtNum(test.estimatedMinutes, locale),
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-fg1)] transition-[gap] duration-200 group-hover:gap-2.5 group-hover:text-[var(--color-accent)] ${
                          isRtl
                            ? 'font-arabic-body !text-[14px] !font-bold'
                            : 'font-display'
                        }`}
                      >
                        {ctaLabel} <Arrow aria-hidden className="h-[13px] w-[13px]" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
