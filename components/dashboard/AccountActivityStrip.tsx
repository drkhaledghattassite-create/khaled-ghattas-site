'use client'

/**
 * Phase 5.2 — compact activity strip mounted above AccountView on the
 * dashboard root (/dashboard).
 *
 * Distinct from /dashboard/library's full ContinueReadingHero by design:
 *   - Library hero: brand-feel, large progress ring, prominent CTA, sets
 *     the visual tone for the library tab.
 *   - Account strip: an utility row at the top of the account page —
 *     "you have something to resume → here's a one-tap link → here's a
 *     way to see everything." No ring, no cover, no big motion. Just
 *     enough to nudge a returning user to pick up where they left off
 *     instead of getting distracted by the bio editor.
 *
 * Renders nothing when there's no activity (the dashboard root then
 * looks exactly as it did pre-Phase-5.2). The "View all in library"
 * link is always shown when activity exists, regardless of type.
 */

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { useReducedMotion } from '@/lib/motion/hooks'
import { Link } from '@/lib/i18n/navigation'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export type AccountActivity =
  | {
      type: 'BOOK'
      title: string
      href: string
      progress: number
    }
  | {
      type: 'SESSION'
      title: string
      itemTitle: string
      href: string
      progress: number
    }

export function AccountActivityStrip({
  locale,
  activity,
}: {
  locale: 'ar' | 'en'
  activity: AccountActivity | null
}) {
  const t = useTranslations('dashboard_root')
  const tBook = useTranslations('library.continue_reading')
  const tSession = useTranslations('library.continue_watching')
  const isRtl = locale === 'ar'
  const reduceMotion = useReducedMotion()

  if (!activity) return null

  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-arabic-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  const cta = activity.type === 'SESSION' ? tSession('cta') : tBook('cta')
  // The Link icon flips by writing direction so the arrow always points
  // along the reading direction's "forward" axis.
  const Arrow = ArrowRight

  return (
    <motion.section
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-label={t('activity_heading')}
      className="mb-6 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 sm:p-5"
    >
      <h2
        className={`m-0 text-[14px] font-bold leading-[1.2] text-[var(--color-fg2)] ${fontDisplay}`}
      >
        {t('activity_heading')}
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            href={activity.href}
            className={`block truncate text-[16px] font-bold leading-[1.3] text-[var(--color-fg1)] hover:text-[var(--color-accent)] transition-colors ${fontDisplay}`}
          >
            {activity.title}
          </Link>
          {activity.type === 'SESSION' && (
            <span
              className={`block truncate text-[12px] text-[var(--color-fg3)] ${fontBody}`}
            >
              {activity.itemTitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Slim progress chip — no ring; just the number, since this
              strip sits above a full account page and shouldn't fight
              for visual attention. */}
          <span
            dir="ltr"
            className="num-latn inline-flex items-center rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[11px] font-bold tracking-tight text-[var(--color-accent)]"
            aria-hidden
          >
            {activity.progress}%
          </span>
          <Link
            href={activity.href}
            className={`btn-pill btn-pill-primary inline-flex !text-[12px] !py-2 !px-4 ${fontBody}`}
          >
            {cta}
          </Link>
        </div>
      </div>

      <Link
        href="/dashboard/library"
        className={`inline-flex items-center gap-1.5 text-[12px] text-[var(--color-fg3)] hover:text-[var(--color-accent)] transition-colors self-start ${fontBody}`}
      >
        <span>{t('view_all')}</span>
        <Arrow
          className="h-3.5 w-3.5 rtl:rotate-180"
          aria-hidden
          strokeWidth={1.8}
        />
      </Link>
    </motion.section>
  )
}
