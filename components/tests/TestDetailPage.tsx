'use client'

/**
 * Phase C1 — public test detail at /tests/[slug].
 *
 * Editorial header on the leading column (eyebrow chip, title, intro
 * paragraphs split on `\n\n`, meta footer). Sticky CTA card on the
 * trailing rail with three states keyed off (hasSession, latestAttempt):
 *   - logged out → sign-in prompt (preserves the `?redirect=` chain)
 *   - logged in, never attempted → "Ready when you are" + Start
 *   - logged in, has attempt → date + score + Review/Take-again split
 */

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Clock, ListChecks } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { EASE_EDITORIAL, fadeUp } from '@/lib/motion/variants'

type DetailTest = {
  id: string
  slug: string
  titleAr: string
  titleEn: string
  introAr: string
  introEn: string
  category: string
  estimatedMinutes: number
  questionCount: number
}

type Props = {
  locale: 'ar' | 'en'
  test: DetailTest
  hasSession: boolean
  latestAttempt: {
    id: string
    scorePercentage: number
    completedAt: string
  } | null
}

function toArDigits(n: number) {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}

function fmtNum(n: number, locale: 'ar' | 'en') {
  return locale === 'ar' ? toArDigits(n) : String(n)
}

function fmtPct(n: number, locale: 'ar' | 'en') {
  return locale === 'ar' ? `${toArDigits(n)}٪` : `${n}%`
}

function fmtDate(iso: string, locale: 'ar' | 'en') {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale === 'ar' ? 'ar-LB' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function TestDetailPage({
  locale,
  test,
  hasSession,
  latestAttempt,
}: Props) {
  const t = useTranslations('tests')
  const isRtl = locale === 'ar'
  const Arrow = isRtl ? ArrowLeft : ArrowRight

  const title = isRtl ? test.titleAr : test.titleEn
  const introRaw = isRtl ? test.introAr : test.introEn
  // The intro is stored as a single text column with paragraph breaks
  // separated by blank lines. Split on \n\n so each paragraph renders
  // independently. Empty lines are dropped.
  const introParagraphs = introRaw
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const loginHref = `/login?redirect=${encodeURIComponent(`/tests/${test.slug}`)}`
  const takeHref = `/tests/${test.slug}/take`
  const resultHref = latestAttempt
    ? `/tests/${test.slug}/result/${latestAttempt.id}`
    : null

  return (
    <div className="bg-[var(--color-bg)]">
      <div className="mx-auto max-w-[var(--container-max)] [padding-inline:clamp(20px,5vw,56px)]">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
          className="grid items-start gap-[clamp(40px,6vw,80px)] [padding-block:clamp(56px,7vw,96px)] lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]"
        >
          <article className="flex max-w-[64ch] flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] bg-[var(--color-accent-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-accent)] ${
                  isRtl
                    ? 'font-arabic-body !text-[12px] !normal-case !tracking-normal !font-bold'
                    : 'font-display'
                }`}
              >
                {t(`landing.category_${test.category}` as 'landing.category_general')}
              </span>
            </div>
            <h1
              className={`m-0 text-[clamp(34px,5vw,56px)] leading-[1.1] tracking-[-0.01em] text-[var(--color-fg1)] [text-wrap:balance] ${
                isRtl ? 'font-arabic-display' : 'font-display !tracking-[-0.025em]'
              }`}
            >
              {title}
            </h1>
            <div
              className={`pb-1 text-[14px] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body !text-[15px]' : 'font-display'
              }`}
            >
              <span className="font-semibold text-[var(--color-fg1)]">
                {t('detail.author_attribution')}
              </span>
            </div>
            <div className="mt-3.5 flex flex-col gap-4 border-t border-[var(--color-border)] pt-3">
              {introParagraphs.map((p, i) => (
                <p
                  key={i}
                  className={`m-0 text-[17px] leading-[1.95] text-[var(--color-fg1)] ${
                    isRtl
                      ? 'font-arabic-body'
                      : 'font-display !leading-[1.75]'
                  }`}
                >
                  {p}
                </p>
              ))}
            </div>
            <div
              className={`mt-2 flex flex-wrap items-center gap-3.5 border-t border-[var(--color-border)] pt-4.5 text-[13px] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${
                isRtl ? 'font-arabic-body !text-[14px]' : 'font-display'
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
              <span aria-hidden className="inline-block h-[3px] w-[3px] rounded-full bg-[var(--color-border-strong)]" />
              <span>{t('detail.free')}</span>
            </div>
          </article>

          <aside>
            <div className="sticky top-[120px] flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-[clamp(24px,3vw,36px)] shadow-[var(--shadow-card)]">
              {!hasSession ? (
                <>
                  <h2
                    className={`m-0 text-[22px] font-bold leading-[1.3] text-[var(--color-fg1)] ${
                      isRtl
                        ? 'font-arabic-display'
                        : 'font-display !tracking-[-0.015em]'
                    }`}
                  >
                    {t('detail.cta.signed_out_heading')}
                  </h2>
                  <p
                    className={`m-0 text-[15px] leading-[1.7] text-[var(--color-fg2)] ${
                      isRtl ? 'font-arabic-body !text-[15px] !leading-[1.85]' : 'font-display !text-[14.5px]'
                    }`}
                  >
                    {t('detail.cta.signed_out_body')}
                  </p>
                  <Link
                    href={loginHref}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-7 py-3.5 text-[15px] font-semibold text-[var(--color-accent-fg)] transition-colors duration-200 hover:bg-[var(--color-accent-hover)] ${
                      isRtl ? 'font-arabic-body !text-[16px] !font-bold' : 'font-display'
                    }`}
                  >
                    {t('detail.cta.signed_out_button')}
                  </Link>
                  <p
                    className={`m-0 text-center text-[12.5px] text-[var(--color-fg3)] ${
                      isRtl ? 'font-arabic-body !text-[13px]' : 'font-display'
                    }`}
                  >
                    {t('detail.cta.signed_out_secondary')}
                  </p>
                </>
              ) : latestAttempt ? (
                <>
                  <span
                    className={`inline-flex items-center gap-2.5 text-[13px] font-bold text-[var(--color-accent)] ${
                      isRtl
                        ? 'font-arabic-body'
                        : 'font-display !text-[11px] !uppercase tracking-[0.16em]'
                    }`}
                  >
                    {t('detail.cta.taken_eyebrow')}
                  </span>
                  <h2
                    className={`m-0 text-[22px] font-bold leading-[1.3] text-[var(--color-fg1)] ${
                      isRtl
                        ? 'font-arabic-display'
                        : 'font-display !tracking-[-0.015em]'
                    }`}
                  >
                    {t('detail.cta.taken_title', {
                      date: fmtDate(latestAttempt.completedAt, locale),
                      score: fmtPct(latestAttempt.scorePercentage, locale),
                    })}
                  </h2>
                  <p
                    className={`m-0 text-[15px] leading-[1.7] text-[var(--color-fg2)] ${
                      isRtl ? 'font-arabic-body !text-[15px] !leading-[1.85]' : 'font-display !text-[14.5px]'
                    }`}
                  >
                    {t('detail.cta.taken_body')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {resultHref && (
                      <Link
                        href={resultHref}
                        className={`inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-transparent px-4 py-3 text-[14px] font-semibold text-[var(--color-fg1)] transition-colors duration-200 hover:border-[var(--color-fg1)] hover:bg-[var(--color-fg1)] hover:text-[var(--color-bg)] ${
                          isRtl ? 'font-arabic-body !text-[15px] !font-bold' : 'font-display'
                        }`}
                      >
                        {t('detail.cta.taken_review')}
                      </Link>
                    )}
                    <Link
                      href={takeHref}
                      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-3 text-[14px] font-semibold text-[var(--color-accent-fg)] transition-colors duration-200 hover:bg-[var(--color-accent-hover)] ${
                        isRtl ? 'font-arabic-body !text-[15px] !font-bold' : 'font-display'
                      }`}
                    >
                      {t('detail.cta.taken_retake')}
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <h2
                    className={`m-0 text-[22px] font-bold leading-[1.3] text-[var(--color-fg1)] ${
                      isRtl
                        ? 'font-arabic-display'
                        : 'font-display !tracking-[-0.015em]'
                    }`}
                  >
                    {t('detail.cta.ready_heading')}
                  </h2>
                  <p
                    className={`m-0 text-[15px] leading-[1.7] text-[var(--color-fg2)] ${
                      isRtl ? 'font-arabic-body !text-[15px] !leading-[1.85]' : 'font-display !text-[14.5px]'
                    }`}
                  >
                    {t('detail.cta.ready_body')}
                  </p>
                  {test.questionCount === 0 ? (
                    <button
                      type="button"
                      disabled
                      className={`inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-7 py-3.5 text-[15px] font-semibold text-[var(--color-accent-fg)] opacity-50 ${
                        isRtl ? 'font-arabic-body !text-[16px] !font-bold' : 'font-display'
                      }`}
                    >
                      {t('detail.cta.empty_test')}
                    </button>
                  ) : (
                    <Link
                      href={takeHref}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-7 py-3.5 text-[15px] font-semibold text-[var(--color-accent-fg)] transition-colors duration-200 hover:bg-[var(--color-accent-hover)] ${
                        isRtl ? 'font-arabic-body !text-[16px] !font-bold' : 'font-display'
                      }`}
                    >
                      {t('detail.cta.ready_button')}{' '}
                      <Arrow aria-hidden className="h-[14px] w-[14px]" />
                    </Link>
                  )}
                  <p
                    className={`m-0 pt-1 text-center text-[12.5px] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${
                      isRtl ? 'font-arabic-body !text-[13px]' : 'font-display'
                    }`}
                  >
                    {t('card.questions_count', {
                      count: fmtNum(test.questionCount, locale),
                    })}
                    {' · '}
                    {t('card.estimated_minutes', {
                      minutes: fmtNum(test.estimatedMinutes, locale),
                    })}
                  </p>
                </>
              )}
            </div>
          </aside>
        </motion.section>
      </div>
    </div>
  )
}
