'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion/hooks'
import { Link } from '@/lib/i18n/navigation'
import type { LibraryItem } from './LibraryCard'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

/**
 * "Continue reading" hero card. Rendered above the library grid when at
 * least one BOOK item has reading progress past page 1. The candidate
 * (chosen in LibraryView) is the most recently-read item by lastReadAt.
 *
 * Layout is RTL-first via logical properties (start/end, ms/me) and uses
 * the main-site palette tokens (--color-accent, --color-fg1, …) — these
 * cards live outside the reader root so they cannot use --reader-* tokens.
 */
export function ContinueReadingHero({ item }: { item: LibraryItem }) {
  const t = useTranslations('library.continue_reading')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const reduceMotion = useReducedMotion()

  const title = isRtl ? item.titleAr : item.titleEn
  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-arabic-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  const progress =
    item.totalPages > 0
      ? Math.min(100, Math.max(0, Math.round((item.lastPage / item.totalPages) * 100)))
      : Math.max(0, Math.min(100, Math.round(item.progress)))
  const primaryHref = item.primaryHref ?? item.href

  // Progress ring geometry — sized to fit the trailing column comfortably
  // on both mobile (compact) and desktop (full).
  const size = 64
  const stroke = 5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress / 100)

  return (
    <motion.section
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      aria-label={t('label')}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="relative w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
    >
      {/* Decorative accent gradient — bleeds from the trailing edge inward.
          Pointer-events-none keeps the click area on the underlying flex.
          Uses logical inset-inline-end so it stays on the trailing edge in RTL. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 [inset-inline-end:0] w-1/2 [background:linear-gradient(to_left,var(--color-accent-soft)_0%,transparent_100%)] opacity-60 rtl:[background:linear-gradient(to_right,var(--color-accent-soft)_0%,transparent_100%)]"
      />

      <div className="relative grid items-center gap-4 p-4 sm:gap-6 sm:p-6 grid-cols-[80px_1fr] md:grid-cols-[120px_1fr_auto] md:p-7">
        {/* Cover */}
        <Link
          href={primaryHref}
          aria-label={title}
          className="relative block overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-bg-deep)] aspect-[2/3] w-[80px] md:w-[120px] [box-shadow:0_8px_24px_-12px_rgba(0,0,0,0.25)]"
        >
          <Image
            src={item.cover}
            alt=""
            fill
            sizes="(min-width: 768px) 120px, 80px"
            className="object-cover"
          />
        </Link>

        {/* Identity */}
        <div className="flex min-w-0 flex-col gap-1.5 md:gap-2">
          <span
            className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)] ${
              isRtl ? `${fontBody} !text-[12px] !tracking-normal !normal-case !font-bold` : 'font-display'
            }`}
          >
            {t('label')}
          </span>
          <h2
            className={`m-0 text-[clamp(18px,2.4vw,24px)] leading-[1.2] font-bold tracking-[-0.01em] text-[var(--color-fg1)] [text-wrap:balance] ${fontDisplay}`}
          >
            <Link
              href={primaryHref}
              className="hover:text-[var(--color-accent)] transition-colors"
            >
              {title}
            </Link>
          </h2>
          {item.totalPages > 0 && (
            <p
              className={`m-0 text-[13px] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${fontBody}`}
            >
              <span dir="ltr" className="num-latn">
                {t('page_of_total', { current: item.lastPage, total: item.totalPages })}
              </span>
            </p>
          )}
        </div>

        {/* Progress ring + CTA — full row on mobile, dedicated column on md+ */}
        <div className="col-span-2 flex items-center justify-between gap-4 md:col-span-1 md:flex-col md:items-end md:gap-3">
          <div
            className="relative shrink-0"
            style={{ width: size, height: size }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('label')}
          >
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              aria-hidden
              className="-rotate-90"
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="var(--color-border-strong)"
                strokeWidth={stroke}
                fill="none"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="var(--color-accent)"
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{
                  transition: reduceMotion
                    ? 'none'
                    : 'stroke-dashoffset 480ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-[13px] font-bold tabular-nums text-[var(--color-fg1)]"
                dir="ltr"
              >
                {progress}%
              </span>
            </div>
          </div>

          <Link
            href={primaryHref}
            className={`btn-pill btn-pill-primary inline-flex !text-[13px] !py-2.5 !px-5 ${fontBody}`}
          >
            {t('cta')}
          </Link>
        </div>
      </div>
    </motion.section>
  )
}
