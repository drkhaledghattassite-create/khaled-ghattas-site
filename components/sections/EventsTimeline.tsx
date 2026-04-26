'use client'

import { useLocale } from 'next-intl'
import { motion } from 'motion/react'
import type { Event } from '@/lib/db/queries'

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

type Props = {
  upcoming: Event[]
  past: Event[]
  upcomingLabel: string
  pastLabel: string
  registerLabel: string
}

export function EventsTimeline({ upcoming, past, upcomingLabel, pastLabel, registerLabel }: Props) {
  const locale = useLocale()

  return (
    <section className="relative z-[2] bg-cream px-[var(--spacing-md)] py-[var(--spacing-lg)]">
      <div className="mx-auto max-w-[1100px] space-y-[var(--spacing-xl)]">
        <EventGroup
          heading={upcomingLabel}
          events={upcoming}
          locale={locale}
          isUpcoming
          registerLabel={registerLabel}
        />
        <EventGroup
          heading={pastLabel}
          events={past}
          locale={locale}
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
  isUpcoming,
  registerLabel,
}: {
  heading: string
  events: Event[]
  locale: string
  isUpcoming: boolean
  registerLabel: string
}) {
  if (events.length === 0) return null
  return (
    <div>
      <h2
        className="mb-8 uppercase text-ink font-display font-semibold text-[clamp(24px,4vw,36px)] tracking-[-0.5px] [dir=rtl]:font-arabic [dir=rtl]:font-bold [dir=rtl]:tracking-normal"
      >
        {heading}
      </h2>

      <ul className="space-y-4">
        {events.map((event, i) => (
          <motion.li
            key={event.id}
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55, delay: i * 0.08, ease: EASE_OUT_QUART }}
            className="grid grid-cols-[auto_1fr] items-start gap-6 border-b border-dashed border-ink/30 pb-6"
          >
            <DateBlock date={event.startDate} locale={locale} />
            <div className="flex flex-col gap-2">
              <h3
                className="uppercase text-ink font-display font-semibold text-[22px] leading-[1.2] tracking-[-0.5px] [dir=rtl]:font-arabic [dir=rtl]:font-bold [dir=rtl]:tracking-normal"
              >
                {locale === 'ar' ? event.titleAr : event.titleEn}
              </h3>
              <p className="font-label text-[12px] text-amber">
                {(locale === 'ar' ? event.locationAr : event.locationEn) ?? ''}
              </p>
              <p
                className="text-ink-muted font-serif italic text-[15px] leading-[1.6] [dir=rtl]:font-arabic [dir=rtl]:not-italic"
              >
                {locale === 'ar' ? event.descriptionAr : event.descriptionEn}
              </p>
              {isUpcoming && event.registrationUrl && (
                <a
                  href={event.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-label mt-2 inline-flex w-max items-center gap-2 rounded-full border border-dashed border-ink bg-ink px-4 py-2 text-[11px] tracking-[0.08em] text-cream-soft transition-colors duration-300 hover:bg-transparent hover:text-ink"
                >
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cream-soft" />
                  {registerLabel}
                </a>
              )}
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function DateBlock({ date, locale }: { date: Date; locale: string }) {
  const day = date.getUTCDate().toString().padStart(2, '0')
  const month = date.toLocaleDateString(locale === 'ar' ? 'ar' : 'en', {
    month: 'short',
    timeZone: 'UTC',
  })
  const year = date.getUTCFullYear()

  return (
    <div className="flex min-w-[96px] flex-col items-start gap-1">
      <span
        className="text-amber font-serif italic text-[44px] leading-[0.9]"
      >
        {day}
      </span>
      <span className="font-label text-[11px] uppercase text-ink">
        {month} {year}
      </span>
    </div>
  )
}
