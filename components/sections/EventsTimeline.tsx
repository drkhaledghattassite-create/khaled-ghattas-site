'use client'

import { useLocale } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import type { Event } from '@/lib/db/queries'
import { cn } from '@/lib/utils'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

type Props = {
  upcoming: Event[]
  past: Event[]
  upcomingLabel: string
  pastLabel: string
  registerLabel: string
}

export function EventsTimeline({
  upcoming,
  past,
  upcomingLabel,
  pastLabel,
  registerLabel,
}: Props) {
  const locale = useLocale()
  const isRtl = locale === 'ar'

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      className="border-b border-[var(--color-border)] [padding:clamp(64px,8vw,112px)_clamp(20px,5vw,56px)]"
    >
      <div className="mx-auto max-w-[920px] flex flex-col gap-[clamp(64px,8vw,96px)]">
        <EventGroup
          heading={upcomingLabel}
          events={upcoming}
          locale={locale}
          isRtl={isRtl}
          isUpcoming
          registerLabel={registerLabel}
        />
        <EventGroup
          heading={pastLabel}
          events={past}
          locale={locale}
          isRtl={isRtl}
          isUpcoming={false}
          registerLabel={registerLabel}
        />
      </div>
    </section>
  )
}

function EventGroup({
  heading,
  events,
  locale,
  isRtl,
  isUpcoming,
  registerLabel,
}: {
  heading: string
  events: Event[]
  locale: string
  isRtl: boolean
  isUpcoming: boolean
  registerLabel: string
}) {
  if (events.length === 0) return null
  return (
    <div>
      <header className="grid items-end gap-2 pb-10 md:pb-12">
        <span className="section-eyebrow">
          {isUpcoming ? (isRtl ? 'الجدول' : 'Schedule') : (isRtl ? 'الأرشيف' : 'Archive')}
        </span>
        <h2 className="section-title">{heading}</h2>
      </header>

      <ul className="m-0 p-0 list-none">
        {events.map((event, i) => (
          <motion.li
            key={event.id}
            initial={{ y: 16, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55, delay: Math.min(i * 0.05, 0.25), ease: EASE }}
            className={cn(
              'grid grid-cols-[auto_1fr] items-start gap-[clamp(20px,3vw,40px)] py-7 border-b border-[var(--color-border)]',
              !isUpcoming && 'opacity-90',
            )}
          >
            <DateBlock date={event.startDate} locale={locale} isRtl={isRtl} />
            <div className="flex flex-col gap-2.5 min-w-0">
              <h3
                className={cn(
                  'm-0 text-[clamp(20px,2.4vw,26px)] leading-[1.25] font-bold text-[var(--color-fg1)] [text-wrap:balance]',
                  isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.012em]',
                )}
              >
                {locale === 'ar' ? event.titleAr : event.titleEn}
              </h3>
              {((locale === 'ar' ? event.locationAr : event.locationEn) ?? '') && (
                <span
                  className={cn(
                    'inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]',
                    isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display',
                  )}
                >
                  <span aria-hidden className="inline-block w-[5px] h-[5px] rounded-full bg-[var(--color-accent)]" />
                  {(locale === 'ar' ? event.locationAr : event.locationEn) ?? ''}
                </span>
              )}
              <p
                className={cn(
                  'm-0 text-[15px] leading-[1.65] text-[var(--color-fg2)] [text-wrap:pretty]',
                  isRtl ? 'font-arabic-body' : 'font-display',
                )}
              >
                {locale === 'ar' ? event.descriptionAr : event.descriptionEn}
              </p>
              {isUpcoming && (
                <Link
                  href="/contact"
                  className="btn-pill btn-pill-accent self-start mt-2 text-[13px]"
                >
                  {registerLabel}
                </Link>
              )}
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function DateBlock({ date, locale, isRtl }: { date: Date; locale: string; isRtl: boolean }) {
  const day = date.getUTCDate().toString().padStart(2, '0')
  const month = date.toLocaleDateString(locale === 'ar' ? 'ar' : 'en', {
    month: 'short',
    timeZone: 'UTC',
  })
  const year = date.getUTCFullYear()

  return (
    <div className="flex min-w-[88px] flex-col items-start gap-0.5 border-s-[3px] border-[var(--color-accent)] ps-4">
      <span
        className={cn(
          'text-[clamp(36px,4vw,48px)] leading-[0.95] font-extrabold tracking-[-0.02em] text-[var(--color-fg1)] [font-feature-settings:"tnum"]',
          isRtl ? 'font-arabic-display' : 'font-arabic-display',
        )}
      >
        {day}
      </span>
      <span
        className={cn(
          'text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)]',
          isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold' : 'font-display',
        )}
      >
        {month} {year}
      </span>
    </div>
  )
}
