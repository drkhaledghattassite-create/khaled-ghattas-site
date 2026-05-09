'use client'

/**
 * Phase A3 — customer-facing list of the user's booking_orders rendered at
 * /dashboard/bookings. Pure client component; the page server-fetches the
 * rows and passes them in pre-projected (locale-aware title resolve, etc).
 *
 * For v1, the "Manage booking" CTA opens a mailto: to the public team
 * inbox — admin handles changes manually (cohort swaps, refund requests).
 * Phase B will replace this with self-service flows where it makes sense
 * (cancel-with-refund-window, change cohort).
 */

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { ArrowRight, CalendarCheck, CalendarClock, CircleX, RotateCcw } from 'lucide-react'
import { useReducedMotion } from '@/lib/motion/hooks'
import { Link } from '@/lib/i18n/navigation'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const TEAM_INBOX = 'Team@drkhaledghattass.com'

export type BookingsListItem = {
  id: string
  title: string
  cohortLabel: string | null
  /** ISO string; the component formats per-locale. */
  nextCohortDate: string | null
  format: string | null
  amountPaid: number // cents
  currency: string
  status: 'PENDING' | 'PAID' | 'FULFILLED' | 'REFUNDED' | 'FAILED'
}

function fmtAmount(cents: number, currency: string, locale: 'ar' | 'en'): string {
  const major = (cents / 100).toFixed(2)
  const cur = currency.toUpperCase()
  return locale === 'ar' ? `${major} ${cur}` : `${cur} ${major}`
}

function fmtDate(iso: string, locale: 'ar' | 'en'): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
  }).format(new Date(iso))
}

export function BookingsList({
  locale,
  items,
}: {
  locale: 'ar' | 'en'
  items: BookingsListItem[]
}) {
  const t = useTranslations('dashboard_bookings')
  const tList = useTranslations('dashboard_bookings.list')
  const isRtl = locale === 'ar'
  const reduceMotion = useReducedMotion()

  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-arabic-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  if (items.length === 0) {
    return (
      <motion.section
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="flex flex-col items-start gap-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 sm:p-10"
      >
        <h2
          className={`m-0 text-[20px] font-bold leading-[1.2] text-[var(--color-fg1)] ${fontDisplay}`}
        >
          {t('empty.title')}
        </h2>
        <p
          className={`m-0 max-w-[60ch] text-[14px] leading-[1.7] text-[var(--color-fg2)] ${fontBody}`}
        >
          {t('empty.body')}
        </p>
        <Link href="/booking" className={`btn-pill btn-pill-primary ${fontBody}`}>
          {t('empty.cta')}
          <ArrowRight
            className="ms-1.5 h-3.5 w-3.5 rtl:rotate-180"
            aria-hidden
            strokeWidth={1.8}
          />
        </Link>
      </motion.section>
    )
  }

  return (
    <motion.ul
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="m-0 grid list-none grid-cols-1 gap-3 p-0"
    >
      {items.map((item) => {
        const cohortText = item.cohortLabel
          ? item.cohortLabel
          : item.nextCohortDate
          ? fmtDate(item.nextCohortDate, locale)
          : null
        return (
          <li
            key={item.id}
            className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 sm:p-5 md:flex-row md:items-center md:justify-between md:gap-6"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <StatusPill status={item.status} fontBody={fontBody} />
                <span
                  className={`text-[12px] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${fontBody}`}
                >
                  {fmtAmount(item.amountPaid, item.currency, locale)}
                </span>
              </div>
              <h3
                className={`m-0 truncate text-[17px] font-bold leading-[1.3] text-[var(--color-fg1)] ${fontDisplay}`}
              >
                {item.title}
              </h3>
              <div
                className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--color-fg3)] ${fontBody}`}
              >
                {cohortText && (
                  <span>{tList('cohort_date', { date: cohortText })}</span>
                )}
                {item.format && (
                  <span>{tList('format', { format: item.format })}</span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <a
                href={`mailto:${TEAM_INBOX}?subject=${encodeURIComponent(
                  `${tList('manage_subject')} — ${item.id.slice(0, 8).toUpperCase()}`,
                )}`}
                className={`btn-pill btn-pill-secondary !text-[12px] !py-2 !px-4 ${fontBody}`}
              >
                {tList('manage_cta')}
              </a>
            </div>
          </li>
        )
      })}
    </motion.ul>
  )
}

function StatusPill({
  status,
  fontBody,
}: {
  status: BookingsListItem['status']
  fontBody: string
}) {
  const tList = useTranslations('dashboard_bookings.list')

  // PAID + FULFILLED both render as "Confirmed" — from the user's POV the
  // distinction is internal (a fulfilled order is one where admin has
  // closed out manual logistics; the customer's seat is reserved either
  // way). PENDING / REFUNDED / FAILED each get their own pill colour so a
  // user scanning the list spots a refund or failure immediately.
  const configs: Record<
    BookingsListItem['status'],
    { label: string; bg: string; fg: string; Icon: typeof CalendarCheck }
  > = {
    PAID: {
      label: tList('confirmed'),
      bg: 'bg-[var(--color-accent-soft)]',
      fg: 'text-[var(--color-accent)]',
      Icon: CalendarCheck,
    },
    FULFILLED: {
      label: tList('confirmed'),
      bg: 'bg-[var(--color-accent-soft)]',
      fg: 'text-[var(--color-accent)]',
      Icon: CalendarCheck,
    },
    PENDING: {
      label: tList('pending'),
      bg: 'bg-[var(--color-bg-deep)]',
      fg: 'text-[var(--color-fg3)]',
      Icon: CalendarClock,
    },
    REFUNDED: {
      label: tList('refunded'),
      bg: 'bg-[var(--color-bg-deep)]',
      fg: 'text-[var(--color-fg2)]',
      Icon: RotateCcw,
    },
    FAILED: {
      label: tList('failed'),
      bg: 'bg-[var(--color-bg-deep)]',
      fg: 'text-[var(--color-destructive)]',
      Icon: CircleX,
    },
  }
  const c = configs[status]
  const Icon = c.Icon

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${c.bg} ${c.fg} ${fontBody}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {c.label}
    </span>
  )
}
