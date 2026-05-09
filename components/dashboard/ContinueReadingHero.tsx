'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion/hooks'
import { Link } from '@/lib/i18n/navigation'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

/**
 * Phase 5 — unified continue-activity surface.
 *
 * One hero card, two content shapes:
 *   - BOOK: shows book cover, title, "Continue reading", page X of Y,
 *     progress ring of pages-read percent, CTA → reader.
 *   - SESSION: shows session cover, session title, "Continue watching",
 *     a subtitle with the SPECIFIC item the user was on, "elapsed / total"
 *     timestamp for that item, progress ring of that item's playback
 *     percent, CTA → session viewer (auto-resumes the right item via
 *     pickInitialItemId on the page server component).
 *
 * Visual treatment is shared deliberately — same layout, same accent
 * gradient bleed, same progress ring geometry, same CTA pill. Only the
 * label, the secondary line, and the route target swap. Don't fork this
 * into two components.
 */
export type HeroActivity =
  | {
      type: 'BOOK'
      bookId: string
      titleAr: string
      titleEn: string
      cover: string
      primaryHref: string
      lastPage: number
      totalPages: number
    }
  | {
      type: 'SESSION'
      sessionId: string
      sessionTitleAr: string
      sessionTitleEn: string
      itemTitle: string
      cover: string
      primaryHref: string
      lastPositionSeconds: number
      /** 0 when unknown — the timestamp display drops the "/ total" part. */
      durationSeconds: number
    }

function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${m}:${pad(s)}`
}

export function ContinueReadingHero({ activity }: { activity: HeroActivity }) {
  // Translation namespaces split: BOOK uses the existing `continue_reading`
  // namespace (label + cta + page_of_total), SESSION uses the new
  // `continue_watching` namespace (label + cta). The two share visual
  // treatment but not copy.
  const tBook = useTranslations('library.continue_reading')
  const tSession = useTranslations('library.continue_watching')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const reduceMotion = useReducedMotion()

  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-arabic-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  const isSession = activity.type === 'SESSION'
  const title = isSession
    ? isRtl
      ? activity.sessionTitleAr
      : activity.sessionTitleEn
    : isRtl
      ? activity.titleAr
      : activity.titleEn
  const label = isSession ? tSession('label') : tBook('label')
  const cta = isSession ? tSession('cta') : tBook('cta')
  const ariaLabel = label

  // Progress percent — pages-read for BOOK, position-of-duration for SESSION.
  // Both clamp 0-100 and round to a whole percent for the ring + readout.
  const progress = isSession
    ? activity.durationSeconds > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (activity.lastPositionSeconds / activity.durationSeconds) * 100,
            ),
          ),
        )
      : 0
    : activity.totalPages > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((activity.lastPage / activity.totalPages) * 100),
          ),
        )
      : 0

  // Secondary line: page-of-total for BOOK, item-title for SESSION.
  const secondary = isSession
    ? activity.itemTitle
    : activity.totalPages > 0
      ? tBook('page_of_total', {
          current: activity.lastPage,
          total: activity.totalPages,
        })
      : null

  // Timestamp readout for SESSION only — the page-of-total line is BOOK's
  // equivalent. Skip the "/ total" portion when duration is unknown.
  const timestampReadout = isSession
    ? activity.durationSeconds > 0
      ? tSession('timestamp', {
          elapsed: formatTimestamp(activity.lastPositionSeconds),
          total: formatTimestamp(activity.durationSeconds),
        })
      : formatTimestamp(activity.lastPositionSeconds)
    : null

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
      aria-label={ariaLabel}
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
        {/* Cover. Sessions use a 16:10 thumbnail-shaped cover (matches the
            playlist + library card aspect for sessions); books keep the
            2:3 portrait. */}
        <Link
          href={activity.primaryHref}
          aria-label={title}
          className={`relative block overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-bg-deep)] [box-shadow:0_8px_24px_-12px_rgba(0,0,0,0.25)] ${
            isSession
              ? 'aspect-video w-[80px] md:w-[120px]'
              : 'aspect-[2/3] w-[80px] md:w-[120px]'
          }`}
        >
          <Image
            src={activity.cover}
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
            {label}
          </span>
          <h2
            className={`m-0 text-[clamp(18px,2.4vw,24px)] leading-[1.2] font-bold tracking-[-0.01em] text-[var(--color-fg1)] [text-wrap:balance] ${fontDisplay}`}
          >
            <Link
              href={activity.primaryHref}
              className="hover:text-[var(--color-accent)] transition-colors"
            >
              {title}
            </Link>
          </h2>
          {/* Subtitle row — item title for SESSION, page-of-total for BOOK. */}
          {secondary != null && (
            <p
              className={`m-0 truncate text-[13px] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${fontBody}`}
            >
              {isSession ? (
                <span className="block truncate">{secondary}</span>
              ) : (
                <span dir="ltr" className="num-latn">
                  {secondary}
                </span>
              )}
            </p>
          )}
          {/* Timestamp readout (SESSION only). Sits below the item-title
              subtitle so the eye reads: session-title → item-title →
              elapsed/total. */}
          {timestampReadout != null && (
            <p
              className={`m-0 text-[12px] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${fontBody}`}
            >
              <span dir="ltr" className="num-latn">
                {timestampReadout}
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
            aria-label={ariaLabel}
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
            href={activity.primaryHref}
            className={`btn-pill btn-pill-primary inline-flex !text-[13px] !py-2.5 !px-5 ${fontBody}`}
          >
            {cta}
          </Link>
        </div>
      </div>
    </motion.section>
  )
}
