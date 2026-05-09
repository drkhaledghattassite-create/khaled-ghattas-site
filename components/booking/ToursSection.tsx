'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowLeft, ArrowRight, Calendar, ChevronDown, ExternalLink, MapPin } from 'lucide-react'
import { motion } from 'motion/react'
import type { Tour } from '@/lib/db/queries'
import { fadeUp, staggerContainerWith, VIEWPORT_DEFAULT } from '@/lib/motion/variants'

type Props = {
  tours: Tour[]
  pastTours: Tour[]
  onSuggest: () => void
}

function formatMonthLabel(date: Date, locale: string): string {
  const lang = locale === 'ar' ? 'ar-EG' : 'en-US'
  return date.toLocaleDateString(lang, { month: 'short', year: 'numeric' })
}

function formatDay(date: Date, locale: string): string {
  const day = date.getDate()
  return locale === 'ar' ? day.toLocaleString('ar-EG') : String(day)
}

export function ToursSection({ tours, pastTours, onSuggest }: Props) {
  const t = useTranslations('booking.tours')
  const tSuggest = useTranslations('booking.suggest')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [pastOpen, setPastOpen] = useState(false)

  const ArrowFollow = isRtl ? ArrowLeft : ArrowRight

  return (
    <section
      id="tours"
      className="border-b border-[var(--color-border)] [padding:clamp(80px,10vw,128px)_clamp(20px,5vw,56px)] [scroll-margin-top:120px]"
    >
      <div className="mx-auto max-w-[var(--container-max)]">
        <header className="grid items-end gap-6 border-b border-[var(--color-border)] [padding-bottom:clamp(36px,5vw,56px)] [margin-bottom:clamp(36px,5vw,56px)] md:grid-cols-[1fr_auto]">
          <div>
            <div
              className={`mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)] ${
                isRtl
                  ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                  : 'font-display'
              }`}
            >
              {t('label')}
            </div>
            <h2
              className={`m-0 text-[clamp(32px,4.5vw,56px)] font-extrabold leading-[1.02] tracking-[-0.02em] text-[var(--color-fg1)] [text-wrap:balance] ${
                isRtl
                  ? 'font-arabic-display'
                  : 'font-arabic-display !tracking-[-0.03em]'
              }`}
            >
              {t('title')}
            </h2>
            <p
              className={`mt-3.5 max-w-[540px] text-[16px] leading-[1.6] text-[var(--color-fg2)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {t('lead')}
            </p>
          </div>
          <div
            className={`flex flex-col gap-1.5 text-[13px] font-medium text-[var(--color-fg3)] [font-feature-settings:'tnum'] md:items-end ${
              isRtl ? 'font-arabic-body md:items-start' : 'font-display'
            }`}
          >
            <span>
              <strong className="font-bold text-[var(--color-fg1)] text-[14px]">
                {tours.length}
              </strong>{' '}
              {t('meta_upcoming')}
            </span>
            {pastTours.length > 0 && (
              <span>
                {pastTours.length} {t('meta_past')}
              </span>
            )}
          </div>
        </header>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_DEFAULT}
          variants={staggerContainerWith(0.06, 0.1)}
          // When there are 0 tours, drop the hairline-grid background so the
          // lone suggest card doesn't sit in a sea of border-color empty cells.
          // The grid still adapts via auto-fill — we just stop painting the
          // gap-fill backdrop.
          className={`grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] overflow-hidden rounded-md border border-[var(--color-border)] ${
            tours.length > 0
              ? 'gap-px bg-[var(--color-border)]'
              : 'gap-0 bg-transparent'
          }`}
        >
          {tours.map((tour) => {
            const date = new Date(tour.date)
            const month = formatMonthLabel(date, locale)
            const day = formatDay(date, locale)
            const region = isRtl ? tour.regionAr : tour.regionEn
            const city = isRtl ? tour.cityAr : tour.cityEn
            const country = isRtl ? tour.countryAr : tour.countryEn
            const venue = isRtl ? tour.venueAr : tour.venueEn

            return (
              <motion.article
                key={tour.id}
                variants={fadeUp}
                className="relative flex min-h-[280px] flex-col gap-[18px] bg-[var(--color-bg-elevated)] [padding:clamp(24px,3vw,36px)] transition-colors hover:bg-[var(--color-bg)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)] [font-feature-settings:'tnum'] ${
                      isRtl
                        ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                        : 'font-display'
                    }`}
                  >
                    {month}
                  </div>
                  {region && (
                    <span
                      className={`rounded-full border border-[var(--color-border)] px-2.5 py-[5px] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] ${
                        isRtl
                          ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold'
                          : 'font-display'
                      }`}
                    >
                      {region}
                    </span>
                  )}
                </div>
                <div
                  className={`text-[56px] font-extrabold leading-[0.9] tracking-[-0.04em] text-[var(--color-fg1)] [font-feature-settings:'tnum'] ${
                    isRtl ? 'font-arabic-display' : 'font-arabic-display'
                  }`}
                >
                  {day}
                </div>
                <div>
                  <div
                    className={`text-[26px] font-bold leading-[1.15] tracking-[-0.01em] text-[var(--color-fg1)] ${
                      isRtl
                        ? 'font-arabic-display'
                        : 'font-arabic-display !tracking-[-0.02em]'
                    }`}
                  >
                    {city}
                  </div>
                  <div
                    className={`mt-1.5 flex flex-col gap-1.5 text-[14px] leading-[1.5] text-[var(--color-fg2)] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin
                        aria-hidden
                        className="h-3.5 w-3.5 shrink-0 opacity-60"
                      />
                      <span>{country}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Calendar
                        aria-hidden
                        className="h-3.5 w-3.5 shrink-0 opacity-60"
                      />
                      <span>{venue ?? t('venue_tba')}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-3">
                  {tour.externalBookingUrl ? (
                    <a
                      href={tour.externalBookingUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={`inline-flex items-center gap-2 border-b border-[var(--color-fg1)] pb-0.5 text-[13px] font-semibold text-[var(--color-fg1)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] ${
                        isRtl ? 'font-arabic-body' : 'font-display'
                      }`}
                    >
                      <span>{t('book_cta')}</span>
                      <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span
                      className={`text-[13px] font-medium text-[var(--color-fg3)] ${
                        isRtl ? 'font-arabic-body' : 'font-display'
                      }`}
                    >
                      {t('booking_soon')}
                    </span>
                  )}
                </div>
              </motion.article>
            )
          })}

          {/*
           * Suggest-a-city — full-row banner. Spanning the full final row
           * (col-span-full) keeps the hairline grid clean regardless of how
           * many tour cards precede it: no empty gray cells, no awkward
           * lone-card layout. On a single-column grid this is a no-op
           * (the card is already 1 col wide); on 2/3/4-col grids it becomes
           * a wide accent banner-CTA — which reads stronger anyway.
           */}
          <motion.article
            variants={fadeUp}
            className="col-span-full flex min-h-[280px] flex-col gap-3.5 bg-[var(--color-fg1)] text-[var(--color-bg)] [padding:clamp(28px,3vw,40px)]"
          >
            <div
              className={`text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-bg)]/55 ${
                isRtl
                  ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                  : 'font-display'
              }`}
            >
              {tSuggest('eyebrow')}
            </div>
            <h3
              className={`m-0 text-[26px] font-bold leading-[1.2] tracking-[-0.01em] text-[var(--color-bg)] ${
                isRtl
                  ? 'font-arabic-display'
                  : 'font-arabic-display !tracking-[-0.02em]'
              }`}
            >
              {tSuggest('title')}
            </h3>
            <p
              className={`m-0 text-[14px] leading-[1.55] text-[var(--color-bg)]/65 ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {tSuggest('body')}
            </p>
            <button
              type="button"
              onClick={onSuggest}
              className={`mt-auto inline-flex items-center gap-2 self-start rounded-full border border-white/40 bg-transparent px-[22px] py-[11px] text-[13.5px] font-semibold text-[var(--color-bg)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              <span>{tSuggest('cta')}</span>
              <ArrowFollow aria-hidden className="h-3.5 w-3.5" />
            </button>
          </motion.article>
        </motion.div>

        {pastTours.length > 0 && (
          <div className="mt-[clamp(32px,4vw,48px)] border-t border-[var(--color-border)] pt-7">
            <button
              type="button"
              onClick={() => setPastOpen((v) => !v)}
              className={`inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--color-fg2)] hover:text-[var(--color-fg1)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              <span
                aria-hidden
                className={`inline-flex transition-transform duration-200 ${
                  pastOpen ? 'rotate-180' : ''
                }`}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </span>
              <span>{pastOpen ? t('past_hide') : t('past_show')}</span>
              <span className="font-medium text-[var(--color-fg3)]">
                · {pastTours.length}
              </span>
            </button>

            {pastOpen && (
              <ul className="mt-6 list-none border-t border-[var(--color-border)] p-0">
                {pastTours.map((p) => {
                  const date = new Date(p.date)
                  const month = formatMonthLabel(date, locale)
                  const city = isRtl ? p.cityAr : p.cityEn
                  const venue = isRtl ? p.venueAr : p.venueEn
                  const attended = p.attendedCount

                  return (
                    <li
                      key={p.id}
                      className={`grid grid-cols-[80px_1fr] items-center gap-4 border-b border-[var(--color-border)] py-3.5 text-[14px] text-[var(--color-fg3)] md:grid-cols-[80px_1fr_1fr_auto] ${
                        isRtl ? 'font-arabic-body' : 'font-display'
                      }`}
                    >
                      <span
                        className={`text-[11px] font-bold uppercase tracking-[0.14em] [font-feature-settings:'tnum'] ${
                          isRtl
                            ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                            : 'font-display'
                        }`}
                      >
                        {month}
                      </span>
                      <span className="font-semibold text-[var(--color-fg2)]">
                        {city}
                      </span>
                      <span className="hidden md:inline">{venue ?? ''}</span>
                      {attended != null ? (
                        <span className="hidden md:inline">
                          {attended === 1
                            ? t('past_attended_one', { count: attended })
                            : t('past_attended_other', { count: attended })}
                        </span>
                      ) : (
                        <span className="hidden md:inline" />
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
