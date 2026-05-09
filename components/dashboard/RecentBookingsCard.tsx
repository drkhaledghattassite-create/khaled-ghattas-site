'use client'

/**
 * Phase A3 — slim recap card mounted above AccountView on the dashboard
 * root (/dashboard). Surfaces the user's most recent CONFIRMED booking
 * (status='PAID') so a returning user sees their upcoming cohort without
 * navigating to /dashboard/bookings first.
 *
 * Distinct from AccountActivityStrip by design:
 *   - Activity strip: in-progress consumable content (BOOK / SESSION) with
 *     a numeric progress chip — "resume where you left off".
 *   - This card: forward-looking confirmed event (BOOKING) with a date +
 *     "Confirmed" pill — "you're attending this".
 *
 * Why two separate cards instead of a unified strip: bookings have no
 * progress to display (they aren't consumed; they're scheduled events),
 * and "Continue your booking" makes no UX sense — see the Section 3.4
 * decision in the Phase A3 plan. Adding a third union variant to the
 * activity strip would muddle a clean type.
 *
 * Renders nothing when there's no recent confirmed booking — the dashboard
 * root then falls back to its pre-A3 shape.
 */

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { ArrowRight, CalendarCheck } from 'lucide-react'
import { useReducedMotion } from '@/lib/motion/hooks'
import { Link } from '@/lib/i18n/navigation'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export type RecentBooking = {
  id: string
  title: string
  cohortLabel: string | null
  nextCohortDate: string | null // ISO string; the page formats per-locale
}

export function RecentBookingsCard({
  locale,
  booking,
}: {
  locale: 'ar' | 'en'
  booking: RecentBooking | null
}) {
  const t = useTranslations('dashboard.recent_bookings')
  const tList = useTranslations('dashboard_bookings.list')
  const isRtl = locale === 'ar'
  const reduceMotion = useReducedMotion()

  if (!booking) return null

  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-arabic-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  const cohortText = booking.cohortLabel
    ? booking.cohortLabel
    : booking.nextCohortDate
    ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
        dateStyle: 'medium',
      }).format(new Date(booking.nextCohortDate))
    : null

  return (
    <motion.section
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-label={t('heading')}
      className="mb-6 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 sm:p-5"
    >
      <h2
        className={`m-0 text-[14px] font-bold leading-[1.2] text-[var(--color-fg2)] ${fontDisplay}`}
      >
        {t('heading')}
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            href="/dashboard/bookings"
            className={`block truncate text-[16px] font-bold leading-[1.3] text-[var(--color-fg1)] hover:text-[var(--color-accent)] transition-colors ${fontDisplay}`}
          >
            {booking.title}
          </Link>
          {cohortText && (
            <span
              className={`block truncate text-[12px] text-[var(--color-fg3)] ${fontBody}`}
            >
              {cohortText}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-accent)] ${fontBody}`}
            aria-hidden
          >
            <CalendarCheck className="h-3 w-3" />
            {tList('confirmed')}
          </span>
          <Link
            href="/dashboard/bookings"
            className={`btn-pill btn-pill-primary inline-flex !text-[12px] !py-2 !px-4 ${fontBody}`}
          >
            {t('view_all')}
          </Link>
        </div>
      </div>

      <Link
        href="/dashboard/bookings"
        className={`inline-flex items-center gap-1.5 text-[12px] text-[var(--color-fg3)] hover:text-[var(--color-accent)] transition-colors self-start ${fontBody}`}
      >
        <span>{t('view_all')}</span>
        <ArrowRight
          className="h-3.5 w-3.5 rtl:rotate-180"
          aria-hidden
          strokeWidth={1.8}
        />
      </Link>
    </motion.section>
  )
}
