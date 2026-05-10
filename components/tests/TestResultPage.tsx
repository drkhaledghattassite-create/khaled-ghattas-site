'use client'

/**
 * Phase C1 — result page at /tests/[slug]/result/[attemptId].
 *
 * Score reveal hero, then per-question review. The review renders one
 * card per answer. When the user got it right the card collapses to a
 * single positive block; when wrong, the user's pick is shown above the
 * correct answer so the reflection lands. Optional explanation from
 * Dr. Khaled appears as a pull-quote below.
 */

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { EASE_EDITORIAL, fadeUp } from '@/lib/motion/variants'

type ResultOption = {
  id: string
  displayOrder: number
  labelAr: string
  labelEn: string
  isCorrect?: boolean
}

type ResultAnswer = {
  id: string
  isCorrect: boolean
  question: {
    id: string
    promptAr: string
    promptEn: string
    explanationAr: string | null
    explanationEn: string | null
    options: Array<ResultOption & { isCorrect: boolean }>
  }
  selectedOption: ResultOption
}

type Result = {
  attempt: {
    id: string
    scorePercentage: number
    correctCount: number
    totalCount: number
    completedAt: string
  }
  test: { slug: string; titleAr: string; titleEn: string }
  answers: ResultAnswer[]
}

type Props = {
  locale: 'ar' | 'en'
  result: Result
}

const OPT_MARKERS_AR = ['أ', 'ب', 'ج', 'د', 'هـ', 'و']
const OPT_MARKERS_EN = ['A', 'B', 'C', 'D', 'E', 'F']

function toArDigits(n: number) {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}

function fmtNum(n: number, locale: 'ar' | 'en') {
  return locale === 'ar' ? toArDigits(n) : String(n)
}

function fmtPct(n: number, locale: 'ar' | 'en') {
  return locale === 'ar' ? `${toArDigits(n)}٪` : `${n}%`
}

export function TestResultPage({ locale, result }: Props) {
  const t = useTranslations('tests')
  const isRtl = locale === 'ar'
  const Arrow = isRtl ? ArrowLeft : ArrowRight
  const markers = isRtl ? OPT_MARKERS_AR : OPT_MARKERS_EN

  const { attempt, test, answers } = result

  return (
    <div className="bg-[var(--color-bg)] [padding-block:clamp(48px,6vw,96px)]">
      <div className="mx-auto max-w-[760px] [padding-inline:clamp(20px,5vw,40px)]">
        {/* Score hero */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
          className="flex flex-col gap-5 border-b border-[var(--color-border)] [padding-block-end:clamp(48px,6vw,80px)]"
        >
          <span
            className={`inline-flex items-center gap-2.5 text-[13px] font-bold text-[var(--color-accent)] ${
              isRtl
                ? 'font-arabic-body'
                : 'font-display !text-[11px] !uppercase tracking-[0.16em]'
            }`}
          >
            {t('result.eyebrow')}
          </span>
          <div className="flex flex-wrap items-baseline gap-4.5">
            <h1
              className={`m-0 text-[clamp(40px,6.5vw,80px)] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--color-fg1)] ${
                isRtl ? 'font-arabic-display' : 'font-display !tracking-[-0.03em]'
              }`}
            >
              {t.rich('result.headline', {
                pct: fmtPct(attempt.scorePercentage, locale),
                em: (chunks) => (
                  <em className="not-italic text-[var(--color-accent)]">{chunks}</em>
                ),
              })}
            </h1>
          </div>
          <div
            className={`text-[16px] text-[var(--color-fg2)] [font-feature-settings:'tnum'] ${
              isRtl ? 'font-arabic-body !text-[17px]' : 'font-display'
            }`}
          >
            {t('result.tally', {
              correct: fmtNum(attempt.correctCount, locale),
              total: fmtNum(attempt.totalCount, locale),
            })}
          </div>
          <p
            className={`max-w-[56ch] pt-2 text-[17px] leading-[1.85] text-[var(--color-fg2)] ${
              isRtl ? 'font-arabic-body' : 'font-display !leading-[1.7]'
            }`}
          >
            {t('result.reflection')}
          </p>
        </motion.header>

        {/* Review */}
        <section className="flex flex-col gap-[clamp(20px,2vw,28px)] [padding-block:clamp(40px,5vw,64px)]">
          <header className="flex items-baseline justify-between gap-4">
            <h2
              className={`m-0 text-[clamp(22px,2.5vw,28px)] font-bold text-[var(--color-fg1)] ${
                isRtl
                  ? 'font-arabic-display'
                  : 'font-display !tracking-[-0.015em]'
              }`}
            >
              {t('result.review_heading')}
            </h2>
            <span
              className={`text-[13px] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${
                isRtl ? 'font-arabic-body !text-[14px]' : 'font-display'
              }`}
            >
              {t('result.review_count', {
                count: fmtNum(answers.length, locale),
              })}
            </span>
          </header>

          {answers.map((ans, i) => {
            const correctOption = ans.question.options.find((o) => o.isCorrect)
            const explanation = isRtl
              ? ans.question.explanationAr
              : ans.question.explanationEn
            const userMarker =
              markers[ans.selectedOption.displayOrder] ??
              String(ans.selectedOption.displayOrder + 1)
            const correctMarker = correctOption
              ? markers[correctOption.displayOrder] ??
                String(correctOption.displayOrder + 1)
              : ''
            const userLabel = isRtl
              ? ans.selectedOption.labelAr
              : ans.selectedOption.labelEn
            const correctLabel = correctOption
              ? isRtl
                ? correctOption.labelAr
                : correctOption.labelEn
              : ''
            const prompt = isRtl ? ans.question.promptAr : ans.question.promptEn

            return (
              <motion.article
                key={ans.id}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-15%' }}
                transition={{ duration: 0.45, ease: EASE_EDITORIAL, delay: i * 0.04 }}
                className="flex flex-col gap-4.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-[clamp(22px,2.5vw,32px)]"
              >
                <div className="flex items-baseline gap-3.5">
                  <span
                    className={`text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--color-fg3)] ${
                      isRtl
                        ? 'font-arabic-body !text-[13px] !normal-case !tracking-normal'
                        : 'font-display'
                    }`}
                  >
                    {t('take.question_number', { current: fmtNum(i + 1, locale) })}
                  </span>
                </div>
                <h3
                  className={`m-0 text-[19px] font-semibold leading-[1.5] text-[var(--color-fg1)] ${
                    isRtl
                      ? 'font-arabic-display'
                      : 'font-display !text-[18px] !leading-[1.4]'
                  }`}
                >
                  {prompt}
                </h3>

                {ans.isCorrect ? (
                  <AnswerCard
                    tone="correct"
                    label={t('result.correct_answer')}
                    text={`${correctMarker}. ${correctLabel}`}
                    isRtl={isRtl}
                  />
                ) : (
                  <>
                    <AnswerCard
                      tone="wrong"
                      label={t('result.your_answer')}
                      text={`${userMarker}. ${userLabel}`}
                      isRtl={isRtl}
                    />
                    {correctOption && (
                      <AnswerCard
                        tone="correct"
                        label={t('result.correct_answer')}
                        text={`${correctMarker}. ${correctLabel}`}
                        isRtl={isRtl}
                      />
                    )}
                  </>
                )}

                {explanation && (
                  <div className="ms-3.5 mt-1 flex flex-col gap-2 rounded-[var(--radius-md)] border-s-[3px] border-[var(--color-accent)] bg-[var(--color-bg)] px-5 py-4.5">
                    <span
                      className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] ${
                        isRtl
                          ? 'font-arabic-body !text-[13px] !normal-case !tracking-normal'
                          : 'font-display'
                      }`}
                    >
                      {t('result.explanation_label')}
                    </span>
                    <p
                      className={`m-0 text-[16px] leading-[1.85] text-[var(--color-fg1)] ${
                        isRtl
                          ? 'font-arabic-body italic'
                          : 'font-display italic !text-[15px] !leading-[1.7]'
                      }`}
                    >
                      {explanation}
                    </p>
                  </div>
                )}
              </motion.article>
            )
          })}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] [padding-block-start:clamp(40px,5vw,56px)]">
          <span
            className={`text-[13px] text-[var(--color-fg3)] ${
              isRtl ? 'font-arabic-body !text-[14px]' : 'font-display'
            }`}
          >
            {/* keep the row balanced even when no share button is rendered */}
            {' '}
          </span>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={`/tests/${test.slug}/take`}
              className={`inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-transparent px-6 py-3 text-[14px] font-semibold text-[var(--color-fg1)] transition-colors duration-200 hover:border-[var(--color-fg1)] hover:bg-[var(--color-fg1)] hover:text-[var(--color-bg)] ${
                isRtl ? 'font-arabic-body !text-[15px] !font-bold' : 'font-display'
              }`}
            >
              {t('result.cta.retake')}
            </Link>
            <Link
              href="/tests"
              className={`inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-[14px] font-semibold text-[var(--color-accent-fg)] transition-colors duration-200 hover:bg-[var(--color-accent-hover)] ${
                isRtl ? 'font-arabic-body !text-[15px] !font-bold' : 'font-display'
              }`}
            >
              {t('result.cta.browse')} <Arrow aria-hidden className="h-[13px] w-[13px]" />
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}

function AnswerCard({
  tone,
  label,
  text,
  isRtl,
}: {
  tone: 'correct' | 'wrong'
  label: string
  text: string
  isRtl: boolean
}) {
  // The two states use mix-with-bg colors so the result page reads on
  // light + dark without a separate dark map. Success uses #1F6B3A,
  // wrong uses #B6422A — these are NOT generic Qalem tokens but the
  // result-specific palette from the design bundle's tests.css. They
  // were deliberately picked to feel editorial, not alarmistic; we keep
  // them inline because they're scoped to this surface only.
  const isCorrect = tone === 'correct'
  const wrap =
    'grid grid-cols-[28px_1fr] items-start gap-3.5 rounded-[var(--radius-md)] border px-5 py-4'
  const palette = isCorrect
    ? 'bg-[color-mix(in_srgb,#1F6B3A_6%,var(--color-bg-elevated))] border-[color-mix(in_srgb,#1F6B3A_25%,var(--color-border))]'
    : 'bg-[color-mix(in_srgb,#B6422A_6%,var(--color-bg-elevated))] border-[color-mix(in_srgb,#B6422A_25%,var(--color-border))]'
  const iconBg = isCorrect
    ? 'bg-[#1F6B3A] text-white'
    : 'bg-[#B6422A] text-white'
  const Icon = isCorrect ? Check : X
  return (
    <div className={`${wrap} ${palette}`}>
      <span
        aria-hidden
        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${iconBg}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex flex-col gap-1">
        <span
          className={`text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-fg2)] ${
            isRtl
              ? 'font-arabic-body !text-[13px] !normal-case !tracking-normal !font-bold'
              : 'font-display'
          }`}
        >
          {label}
        </span>
        <span
          className={`text-[16px] font-medium leading-[1.6] text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-body' : 'font-display !text-[15px]'
          }`}
        >
          {text}
        </span>
      </div>
    </div>
  )
}
