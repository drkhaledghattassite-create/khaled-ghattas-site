'use client'

/**
 * Per-question breakdown for the analytics page.
 *
 * Shape: question prompt + horizontal stacked bar of option-selection
 * percentages + an enumerated list of options with counts and a
 * check-mark on the correct one + a "{percent}% answered correctly"
 * summary line. Optional explanation toggle when the question has one.
 */

import { useState } from 'react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Check, ChevronDown } from 'lucide-react'
import { EASE_EDITORIAL, staggerItem } from '@/lib/motion/variants'
import { cn } from '@/lib/utils'
import type { AnalyticsQuestionRow } from './TestAnalyticsPage'

type Props = {
  index: number
  row: AnalyticsQuestionRow
  totalAttempts: number
  locale: 'ar' | 'en'
}

// Options use a checkered family so they stay visually distinguishable on
// the stacked bar without colliding with semantic tones (success-soft for
// correct, warning-soft + tints for incorrect). Tones come from globals.
const INCORRECT_TONES = [
  'bg-warning-soft',
  'bg-warning-soft/70',
  'bg-warning-soft/55',
  'bg-warning-soft/40',
  'bg-warning-soft/30',
]

export function QuestionBreakdownCard({
  index,
  row,
  totalAttempts,
  locale,
}: Props) {
  const t = useTranslations('admin.tests.analytics.questions')
  const prompt = locale === 'ar' ? row.question.promptAr : row.question.promptEn
  const explanation =
    locale === 'ar' ? row.question.explanationAr : row.question.explanationEn
  const [showExplanation, setShowExplanation] = useState(false)
  const hasExplanation = !!explanation && explanation.trim().length > 0

  // Build the segments. Correct option always renders in success-soft;
  // incorrect options walk through the warning shade family by index.
  let incorrectIdx = 0
  const segments = row.options.map((o) => {
    let cls = ''
    if (o.isCorrect) cls = 'bg-success-soft'
    else {
      cls = INCORRECT_TONES[incorrectIdx % INCORRECT_TONES.length]
      incorrectIdx++
    }
    return { ...o, cls }
  })

  return (
    <motion.div
      variants={staggerItem}
      transition={{ duration: 0.45, ease: EASE_EDITORIAL }}
      className="rounded-md border border-border bg-bg-elevated p-5"
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-deep text-[12px] font-display font-semibold text-fg2 [font-feature-settings:'tnum']"
        >
          {index + 1}
        </span>
        <p className="flex-1 text-[14px] leading-[1.55] text-fg1">{prompt}</p>
      </div>

      {totalAttempts > 0 ? (
        <>
          <div
            className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-bg-deep"
            role="img"
            aria-label={t('correct_summary', { percent: row.correctPercentage })}
          >
            {segments.map((s) => {
              const widthPct =
                totalAttempts > 0
                  ? Math.max(2, s.selectionPercentage) // Min 2% so even tiny segments render visibly
                  : 0
              if (s.selectionCount === 0) return null
              return (
                <div
                  key={s.option.id}
                  className={cn(s.cls, 'h-full')}
                  style={{ width: `${widthPct}%` }}
                />
              )
            })}
          </div>

          <ul className="mt-4 space-y-1.5">
            {row.options.map((o) => {
              const label =
                locale === 'ar' ? o.option.labelAr : o.option.labelEn
              return (
                <li
                  key={o.option.id}
                  className={cn(
                    'flex items-center gap-2 text-[13px]',
                    o.isCorrect ? 'text-success' : 'text-fg2',
                  )}
                >
                  {o.isCorrect ? (
                    <Check
                      className="h-3.5 w-3.5 shrink-0"
                      aria-label={t('correct_summary', {
                        percent: row.correctPercentage,
                      })}
                    />
                  ) : (
                    <span aria-hidden className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="flex-1">{label}</span>
                  <span className="text-fg3 [font-feature-settings:'tnum']">
                    {t('option_count', {
                      count: o.selectionCount,
                      percent: o.selectionPercentage,
                    })}
                  </span>
                </li>
              )
            })}
          </ul>

          <p className="mt-4 border-t border-border pt-3 text-[12px] uppercase tracking-[0.06em] text-fg2 font-display font-semibold">
            {t('correct_summary', { percent: row.correctPercentage })}
          </p>
        </>
      ) : (
        <p className="mt-4 text-[12px] text-fg3">—</p>
      )}

      {hasExplanation && (
        <div className="mt-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setShowExplanation((v) => !v)}
            aria-expanded={showExplanation}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.06em] text-fg3 font-display font-semibold hover:text-fg1 transition-colors"
          >
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform',
                showExplanation && 'rotate-180',
              )}
              aria-hidden
            />
            {showExplanation
              ? t('hide_explanation')
              : t('view_explanation')}
          </button>
          {showExplanation && (
            <p className="mt-2 rounded-md border-s-[3px] border-accent bg-bg-deep px-3 py-2 text-[13px] leading-[1.7] text-fg2">
              {explanation}
            </p>
          )}
        </div>
      )}
    </motion.div>
  )
}
