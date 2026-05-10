'use client'

/**
 * Phase C1 — `/dashboard/tests` history list.
 *
 * Editorial heading + flat list of attempts, newest first. Each row is a
 * link to the result page for that attempt. Score pills are colored by
 * band (≥80 = success-soft, 50–79 = warning-soft, <50 = neutral). The
 * pill is visual-only — no interpretive copy ("you scored in the high
 * range") because the design rejected that affordance up front.
 */

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, PenLine } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import {
  EASE_EDITORIAL,
  fadeUp,
  staggerContainer,
  staggerItem,
} from '@/lib/motion/variants'

export type ClientTestAttempt = {
  id: string
  scorePercentage: number
  correctCount: number
  totalCount: number
  completedAt: string
  test: {
    id: string
    slug: string
    titleAr: string
    titleEn: string
    category: string
  }
}

type Props = {
  locale: 'ar' | 'en'
  attempts: ClientTestAttempt[]
}

function toArDigits(n: number) {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}

function fmtPct(n: number, locale: 'ar' | 'en') {
  return locale === 'ar' ? `${toArDigits(n)}٪` : `${n}%`
}

function relativeDays(iso: string, locale: 'ar' | 'en') {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const days = Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)))
  if (locale === 'ar') {
    if (days === 0) return 'اليوم'
    if (days === 1) return 'منذ يوم'
    if (days === 2) return 'منذ يومين'
    if (days < 11) return `منذ ${toArDigits(days)} أيام`
    if (days < 30) return `منذ ${toArDigits(days)} يوماً`
    const m = Math.floor(days / 30)
    if (m === 1) return 'منذ شهر'
    if (m === 2) return 'منذ شهرين'
    return `منذ ${toArDigits(m)} أشهر`
  }
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const m = Math.floor(days / 30)
  if (m === 1) return '1 month ago'
  return `${m} months ago`
}

function scoreBandClass(score: number): string {
  // Visual-only bands per the design. ≥80 = success, 50-79 = warning,
  // <50 = neutral. No interpretive copy attached.
  if (score >= 80) {
    return 'bg-[#DCEEDF] text-[#1F6B3A] dark:bg-[rgba(125,212,155,0.14)] dark:text-[#7DD49B]'
  }
  if (score >= 50) {
    return 'bg-[#FBF1D7] text-[#8A6A1B] dark:bg-[rgba(232,197,108,0.14)] dark:text-[#E8C56C]'
  }
  return 'bg-[var(--color-bg-deep)] text-[var(--color-fg2)]'
}

export function DashboardTestsTab({ locale, attempts }: Props) {
  const t = useTranslations('dashboard.tests')
  const tShared = useTranslations('tests')
  const isRtl = locale === 'ar'
  const Arrow = isRtl ? ArrowLeft : ArrowRight

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
      className="flex flex-col"
    >
      <div className="mb-[clamp(28px,3vw,40px)] flex flex-col gap-2">
        <h1
          className={`m-0 text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.01em] text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-display' : 'font-display !tracking-[-0.025em]'
          }`}
        >
          {t('heading')}
        </h1>
        <p
          className={`m-0 text-[15px] text-[var(--color-fg2)] ${
            isRtl ? 'font-arabic-body !text-[16px]' : 'font-display'
          }`}
        >
          {t('subheading')}
        </p>
      </div>

      {attempts.length === 0 ? (
        <div className="flex flex-col items-center gap-3.5 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] [padding:clamp(56px,8vw,96px)_clamp(20px,4vw,40px)] text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <PenLine aria-hidden className="h-5 w-5" />
          </span>
          <h2
            className={`m-0 text-[22px] font-bold text-[var(--color-fg1)] ${
              isRtl ? 'font-arabic-display' : 'font-display !tracking-[-0.015em]'
            }`}
          >
            {t('empty_title')}
          </h2>
          <p
            className={`m-0 max-w-[44ch] text-[15px] leading-[1.7] text-[var(--color-fg2)] ${
              isRtl ? 'font-arabic-body !text-[16px] !leading-[1.85]' : 'font-display'
            }`}
          >
            {t('empty_body')}
          </p>
          <Link
            href="/tests"
            className={`mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-[14px] font-semibold text-[var(--color-accent-fg)] transition-colors duration-200 hover:bg-[var(--color-accent-hover)] ${
              isRtl ? 'font-arabic-body !text-[15px] !font-bold' : 'font-display'
            }`}
          >
            {t('empty_cta')} <Arrow aria-hidden className="h-[13px] w-[13px]" />
          </Link>
        </div>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="m-0 flex list-none flex-col p-0"
        >
          {attempts.map((a) => {
            const title = isRtl ? a.test.titleAr : a.test.titleEn
            return (
              <motion.li
                key={a.id}
                variants={staggerItem}
                className="border-b border-[var(--color-border)] first:border-t"
              >
                <Link
                  href={`/tests/${a.test.slug}/result/${a.id}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 px-1 py-5 transition-colors duration-200 hover:bg-[var(--color-bg-deep)] sm:grid-cols-[1fr_auto_auto_auto] sm:gap-[clamp(16px,3vw,32px)] sm:py-[22px]"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <h4
                      className={`m-0 text-[17px] font-bold leading-[1.35] text-[var(--color-fg1)] ${
                        isRtl ? 'font-arabic-display' : 'font-display !tracking-[-0.01em]'
                      }`}
                    >
                      {title}
                    </h4>
                    <span
                      className={`text-[12.5px] text-[var(--color-fg3)] ${
                        isRtl ? 'font-arabic-body !text-[13px]' : 'font-display'
                      }`}
                    >
                      {tShared(`landing.category_${a.test.category}` as 'landing.category_general')}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[12.5px] font-bold [font-feature-settings:'tnum'] sm:order-2 ${
                      isRtl ? 'font-arabic-body !text-[13px]' : 'font-display'
                    } ${scoreBandClass(a.scorePercentage)}`}
                    aria-label={t('row_score_aria', {
                      score: fmtPct(a.scorePercentage, locale),
                    })}
                  >
                    {fmtPct(a.scorePercentage, locale)}
                  </span>
                  <span
                    className={`hidden text-[13px] text-[var(--color-fg3)] [font-feature-settings:'tnum'] sm:order-3 sm:inline ${
                      isRtl ? 'font-arabic-body !text-[14px]' : 'font-display'
                    }`}
                  >
                    {relativeDays(a.completedAt, locale)}
                  </span>
                  <span
                    className={`hidden items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-[var(--color-fg2)] sm:order-4 sm:inline-flex ${
                      isRtl ? 'font-arabic-body !text-[14px] !font-bold' : 'font-display'
                    }`}
                  >
                    {t('row_review')} <Arrow aria-hidden className="h-[13px] w-[13px]" />
                  </span>
                </Link>
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </motion.div>
  )
}
