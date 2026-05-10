'use client'

/**
 * Phase C2 — analytics view for /admin/tests/[id]/analytics.
 *
 * The feature's core value for Dr. Khaled's research workflow. Treated as
 * editorial: section headings, generous spacing, calm presentation. Not a
 * dense dashboard.
 *
 * Five sections:
 *   1. Test header (title, category, edit/view-on-site CTAs)
 *   2. Top stats — 4 cards
 *   3. Per-question breakdown bars
 *   4. Recent attempts (20 max)
 *   5. Empty state when totalAttempts === 0
 */

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { ExternalLink, PenLine } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { EASE_EDITORIAL, staggerContainer } from '@/lib/motion/variants'
import { AnalyticsStatCard } from './AnalyticsStatCard'
import { QuestionBreakdownCard } from './QuestionBreakdownCard'
import { RecentAttemptsTable } from './RecentAttemptsTable'

export type AnalyticsTestSummary = {
  id: string
  slug: string
  titleAr: string
  titleEn: string
  category: string
  isPublished: boolean
}

export type AnalyticsQuestionRow = {
  question: {
    id: string
    displayOrder: number
    promptAr: string
    promptEn: string
    explanationAr: string | null
    explanationEn: string | null
  }
  options: Array<{
    option: { id: string; labelAr: string; labelEn: string }
    selectionCount: number
    selectionPercentage: number
    isCorrect: boolean
  }>
  correctCount: number
  correctPercentage: number
}

export type AnalyticsRecentAttempt = {
  id: string
  scorePercentage: number
  completedAt: string
  user: { id: string; name: string | null; email: string }
}

export type AnalyticsPayload = {
  test: AnalyticsTestSummary
  totalAttempts: number
  uniqueUsers: number
  averageScore: number | null
  scoreDistribution: Array<{
    band: 'low' | 'medium' | 'high'
    count: number
  }>
  questions: AnalyticsQuestionRow[]
  recentAttempts: AnalyticsRecentAttempt[]
}

type Props = {
  locale: 'ar' | 'en'
  analytics: AnalyticsPayload
}

export function TestAnalyticsPage({ locale, analytics }: Props) {
  const t = useTranslations('admin.tests.analytics')
  const tCat = useTranslations('dashboard.ask.form')

  const title =
    locale === 'ar' ? analytics.test.titleAr : analytics.test.titleEn
  const isEmpty = analytics.totalAttempts === 0

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      transition={{ duration: 0.5, ease: EASE_EDITORIAL }}
      className="space-y-8"
    >
      {/* Section 1 — header */}
      <header className="flex flex-col gap-3 border-b border-border pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
              {tCat(
                `category_${analytics.test.category}` as 'category_general',
              )}
            </p>
            <h1 className="text-fg1 font-display font-semibold text-[24px] tracking-[-0.02em]">
              {title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/tests/${analytics.test.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] uppercase tracking-[0.06em] text-fg2 font-display font-semibold hover:bg-bg-deep hover:text-fg1 transition-colors"
            >
              <PenLine className="h-3.5 w-3.5" aria-hidden />
              {t('cta.edit')}
            </Link>
            {analytics.test.isPublished && (
              <Link
                href={`/tests/${analytics.test.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-fg1 bg-fg1 px-3 py-1.5 text-[12px] uppercase tracking-[0.06em] text-bg font-display font-semibold hover:bg-accent hover:border-accent hover:text-accent-fg transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                {t('cta.view_on_site')}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Section 2 — stats */}
      <section
        aria-label={t('heading')}
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <AnalyticsStatCard
          label={t('stats.total_attempts')}
          value={analytics.totalAttempts}
          variant="number"
        />
        <AnalyticsStatCard
          label={t('stats.unique_users')}
          value={analytics.uniqueUsers}
          variant="number"
        />
        <AnalyticsStatCard
          label={t('stats.average_score')}
          value={
            analytics.averageScore == null ? '—' : `${analytics.averageScore}%`
          }
          variant="number"
        />
        <ScoreDistributionCard
          label={t('stats.score_distribution')}
          distribution={analytics.scoreDistribution}
          totalAttempts={analytics.totalAttempts}
          locale={locale}
        />
      </section>

      {/* Section 3 — per-question breakdown */}
      {!isEmpty && (
        <section className="space-y-4">
          <h2 className="text-[16px] font-display font-semibold text-fg1 tracking-[-0.01em]">
            {t('questions.heading')}
          </h2>
          <div className="space-y-3">
            {analytics.questions.map((q, idx) => (
              <QuestionBreakdownCard
                key={q.question.id}
                index={idx}
                row={q}
                totalAttempts={analytics.totalAttempts}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section 4 — recent attempts */}
      {!isEmpty && (
        <section className="space-y-4">
          <h2 className="text-[16px] font-display font-semibold text-fg1 tracking-[-0.01em]">
            {t('recent.heading')}
          </h2>
          <RecentAttemptsTable rows={analytics.recentAttempts} locale={locale} />
        </section>
      )}

      {/* Section 5 — empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border-strong bg-bg-elevated [padding:clamp(40px,6vw,72px)] text-center">
          <h2 className="text-[18px] font-display font-semibold text-fg1">
            {t('empty.title')}
          </h2>
          <p className="max-w-[44ch] text-[13px] text-fg2 leading-[1.7]">
            {t('empty.body')}
          </p>
          {analytics.test.isPublished && (
            <Link
              href={`/tests/${analytics.test.slug}`}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent px-4 py-2 text-[12px] uppercase tracking-[0.06em] text-accent-fg font-display font-semibold hover:bg-accent-hover transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {t('cta.view_on_site')}
            </Link>
          )}
        </div>
      )}
    </motion.div>
  )
}

/* ── Score distribution card ─────────────────────────────────────────── */

function ScoreDistributionCard({
  label,
  distribution,
  totalAttempts,
  locale,
}: {
  label: string
  distribution: Array<{ band: 'low' | 'medium' | 'high'; count: number }>
  totalAttempts: number
  locale: 'ar' | 'en'
}) {
  const t = useTranslations('admin.tests.analytics.stats')
  const labels: Record<'low' | 'medium' | 'high', string> = {
    low: t('score_band_low'),
    medium: t('score_band_medium'),
    high: t('score_band_high'),
  }
  const bandClasses: Record<'low' | 'medium' | 'high', string> = {
    low: 'bg-bg-deep text-fg2',
    medium: 'bg-warning-soft text-warning',
    high: 'bg-success-soft text-success',
  }

  return (
    <div className="rounded-md border border-border bg-bg-elevated p-4">
      <p className="text-[10px] uppercase tracking-[0.1em] text-fg3 font-display font-semibold">
        {label}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {distribution.map((d) => {
          const pct =
            totalAttempts > 0
              ? Math.round((d.count / totalAttempts) * 100)
              : 0
          return (
            <div key={d.band} className="flex items-center gap-2">
              <span
                className={`inline-flex h-5 min-w-[3rem] items-center justify-center rounded-full px-2 text-[10px] uppercase tracking-[0.06em] font-display font-semibold ${bandClasses[d.band]}`}
              >
                {labels[d.band]}
              </span>
              <span
                className="text-[13px] text-fg1 [font-feature-settings:'tnum']"
                dir={locale === 'ar' ? 'ltr' : 'ltr'}
              >
                {d.count}
              </span>
              <span className="ms-auto text-[11px] text-fg3 [font-feature-settings:'tnum']">
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
