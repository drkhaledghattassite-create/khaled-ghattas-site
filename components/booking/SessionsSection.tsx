'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowLeft, ArrowRight, CalendarCheck } from 'lucide-react'
import { motion } from 'motion/react'
import type { BookingWithHolds } from '@/lib/db/queries'
import { Link } from '@/lib/i18n/navigation'
import { fadeUp, staggerContainerWith, VIEWPORT_DEFAULT } from '@/lib/motion/variants'

type Props = {
  sessions: BookingWithHolds[]
  onReserve: (s: BookingWithHolds) => void
  onInterest: (s: BookingWithHolds, mode: 'sold_out' | 'closed') => void
  /**
   * Bookings the current user already has a PAID/FULFILLED order for.
   * Cards whose id is in here swap their Reserve CTA for a "view in
   * dashboard" link. Set instead of array because we lookup once per
   * card during a render that already iterates `sessions.length` times.
   */
  paidBookingIds: Set<string>
  /**
   * Phase D — when true, render a "Send as gift" link beneath each open
   * session card's Reserve CTA. Sourced from the gifts.allow_user_to_user
   * site-setting at the page boundary.
   */
  allowGifting: boolean
}

type Filter = 'all' | 'open' | 'sold_out' | 'closed'

function effectiveRemaining(b: BookingWithHolds): number {
  return Math.max(0, b.maxCapacity - b.bookedCount - b.activeHoldsCount)
}

function deriveState(b: BookingWithHolds): 'open' | 'sold_out' | 'closed' {
  if (b.bookingState === 'CLOSED') return 'closed'
  if (b.bookingState === 'SOLD_OUT') return 'sold_out'
  return effectiveRemaining(b) === 0 ? 'sold_out' : 'open'
}

function fmtPriceWhole(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function fmtNumber(n: number, locale: string): string {
  return locale === 'ar' ? n.toLocaleString('ar-EG') : String(n)
}

export function SessionsSection({
  sessions,
  onReserve,
  onInterest,
  paidBookingIds,
  allowGifting,
}: Props) {
  const t = useTranslations('booking.sessions')
  const tShared = useTranslations('booking.shared')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [filter, setFilter] = useState<Filter>('all')

  const ArrowFollow = isRtl ? ArrowLeft : ArrowRight

  const counts = useMemo(() => {
    const acc = { all: sessions.length, open: 0, sold_out: 0, closed: 0 }
    for (const s of sessions) {
      const st = deriveState(s)
      acc[st]++
    }
    return acc
  }, [sessions])

  const filtered = useMemo(() => {
    if (filter === 'all') return sessions
    return sessions.filter((s) => deriveState(s) === filter)
  }, [sessions, filter])

  return (
    <section
      id="sessions"
      className="[padding:clamp(80px,10vw,128px)_clamp(20px,5vw,56px)] [scroll-margin-top:120px]"
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
                {counts.open}
              </strong>{' '}
              {t('meta_open')}
            </span>
            <span>
              {t('meta_sold_out_closed', {
                soldOut: counts.sold_out,
                closed: counts.closed,
              })}
            </span>
          </div>
        </header>

        {/* Filter chips */}
        <div className="mb-[clamp(28px,4vw,40px)] flex flex-wrap gap-2">
          {(
            [
              { id: 'all', label: t('filter_all'), count: counts.all },
              { id: 'open', label: t('filter_open'), count: counts.open },
              {
                id: 'sold_out',
                label: t('filter_sold_out'),
                count: counts.sold_out,
              },
              {
                id: 'closed',
                label: t('filter_closed'),
                count: counts.closed,
              },
            ] as const
          ).map((f) => {
            const isActive = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setFilter(f.id)}
                // ≥44px tall on mobile for WCAG-compliant touch targets;
                // shrinks at md+ where pointer precision is higher.
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 py-3 text-[13px] font-semibold transition-colors md:min-h-0 md:py-2 ${
                  isActive
                    ? 'border-[var(--color-fg1)] bg-[var(--color-fg1)] text-[var(--color-bg)]'
                    : 'border-[var(--color-border)] bg-transparent text-[var(--color-fg2)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg1)]'
                } ${isRtl ? 'font-arabic-body' : 'font-display'}`}
              >
                <span>{f.label}</span>
                <span className="text-[11px] opacity-60 [font-feature-settings:'tnum']">
                  {f.count}
                </span>
              </button>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <p
            className={`text-[15px] text-[var(--color-fg3)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('empty_state')}
          </p>
        ) : (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_DEFAULT}
            variants={staggerContainerWith(0.06, 0.1)}
            className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)]"
          >
            {filtered.map((s, idx) => {
              const state = deriveState(s)
              const remaining = effectiveRemaining(s)
              const alreadyBooked = paidBookingIds.has(s.id)
              const isOpen = state === 'open' && !alreadyBooked
              const isSoldOut = state === 'sold_out' && !alreadyBooked
              const isClosed = state === 'closed' && !alreadyBooked
              const isLow = isOpen && remaining > 0 && remaining <= 5

              const handle = () => {
                if (alreadyBooked) return
                if (isOpen) onReserve(s)
                else if (isSoldOut) onInterest(s, 'sold_out')
                else if (isClosed) onInterest(s, 'closed')
              }

              const sessionNumber = String(idx + 1).padStart(2, '0')
              const sessionLabel = t('session_n', {
                n: isRtl ? fmtNumber(idx + 1, locale) : sessionNumber,
              })

              const cohortLabel =
                (isRtl ? s.cohortLabelAr : s.cohortLabelEn) ?? ''

              return (
                <motion.article
                  key={s.id}
                  variants={fadeUp}
                  // The whole card is interactive only when there's an
                  // action (Reserve / Waitlist / Notify). When already
                  // booked, the user clicks the explicit "View in dashboard"
                  // link in the footer instead — wrapping the whole card in
                  // a Link would override hover affordances on the rest of
                  // the content needlessly.
                  role={alreadyBooked ? undefined : 'button'}
                  tabIndex={alreadyBooked ? undefined : 0}
                  onClick={alreadyBooked ? undefined : handle}
                  onKeyDown={
                    alreadyBooked
                      ? undefined
                      : (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handle()
                          }
                        }
                  }
                  className={`relative flex min-h-[320px] flex-col gap-3.5 bg-[var(--color-bg-elevated)] [padding:clamp(20px,2.5vw,28px)] transition-colors ${
                    alreadyBooked
                      ? 'cursor-default'
                      : 'cursor-pointer hover:bg-[var(--color-bg)]'
                  } ${
                    isSoldOut ? 'opacity-70 hover:bg-[var(--color-bg-elevated)]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${
                        isRtl
                          ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold'
                          : 'font-display'
                      }`}
                    >
                      {sessionLabel}
                    </span>
                    {alreadyBooked ? (
                      <span
                        className={`inline-flex items-center gap-1.5 self-start rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)] ${
                          isRtl
                            ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold'
                            : 'font-display'
                        }`}
                      >
                        <CalendarCheck className="h-3 w-3" aria-hidden />
                        {tShared('already_booked')}
                      </span>
                    ) : (
                      <SessionPill
                        isOpen={isOpen}
                        isSoldOut={isSoldOut}
                        isClosed={isClosed}
                        isLow={isLow}
                        remaining={remaining}
                        isRtl={isRtl}
                      />
                    )}
                  </div>
                  <h3
                    className={`m-0 text-[22px] font-bold leading-[1.25] tracking-[-0.005em] text-[var(--color-fg1)] [text-wrap:balance] ${
                      isRtl
                        ? 'font-arabic-display'
                        : 'font-arabic-display !tracking-[-0.015em]'
                    }`}
                  >
                    {isRtl ? s.titleAr : s.titleEn}
                  </h3>
                  <p
                    className={`m-0 text-[14px] leading-[1.55] text-[var(--color-fg2)] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {isRtl ? s.descriptionAr : s.descriptionEn}
                  </p>
                  <div className="mt-auto flex flex-col gap-1 border-t border-[var(--color-border)] pt-3.5 text-[13px] text-[var(--color-fg2)] [font-feature-settings:'tnum']">
                    <div
                      className={`mb-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--color-fg3)] ${
                        isRtl
                          ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold'
                          : 'font-display uppercase'
                      }`}
                    >
                      {t('next_cohort')}
                    </div>
                    <div
                      className={`text-[15px] font-bold tracking-[-0.005em] text-[var(--color-fg1)] ${
                        isRtl
                          ? 'font-arabic-display'
                          : 'font-arabic-display !tracking-[-0.01em]'
                      }`}
                    >
                      {cohortLabel}
                    </div>
                  </div>
                  <div className="mt-3.5 flex items-center justify-between">
                    <div className="text-[22px] font-bold tracking-[-0.01em] text-[var(--color-fg1)] [font-feature-settings:'tnum']">
                      <span className="me-[3px] align-top text-[12px] font-medium text-[var(--color-fg3)]">
                        $
                      </span>
                      {fmtPriceWhole(s.priceUsd)}
                    </div>
                    {alreadyBooked ? (
                      <Link
                        href="/dashboard/bookings"
                        onClick={(e) => e.stopPropagation()}
                        className={`inline-flex items-center gap-1.5 border-b border-[var(--color-accent)] bg-transparent pb-0.5 text-[13px] font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] ${
                          isRtl ? 'font-arabic-body' : 'font-display'
                        }`}
                      >
                        {tShared('view_in_dashboard')}
                        <ArrowFollow aria-hidden className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handle()
                        }}
                        className={`inline-flex items-center gap-1.5 border-b border-[var(--color-fg1)] bg-transparent pb-0.5 text-[13px] font-semibold text-[var(--color-fg1)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] ${
                          isRtl ? 'font-arabic-body' : 'font-display'
                        }`}
                      >
                        <SessionCtaLabel
                          isOpen={isOpen}
                          isSoldOut={isSoldOut}
                          isClosed={isClosed}
                        />
                        <ArrowFollow aria-hidden className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {/* Phase D — quiet gift CTA below the price row. Only on
                      open + not-already-booked cards (no point gifting a
                      sold-out session to someone; capacity is shared with
                      the recipient's eventual claim). stopPropagation so a
                      tap routes to /gifts/send instead of the card's
                      Reserve handler. */}
                  {allowGifting && isOpen && (
                    <Link
                      href={`/gifts/send?type=booking&id=${s.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`mt-1 inline-flex items-center self-start text-[12px] underline text-[var(--color-fg3)] hover:text-[var(--color-fg1)] transition-colors ${
                        isRtl ? 'font-arabic-body' : 'font-display'
                      }`}
                    >
                      {tShared('send_as_gift')}
                    </Link>
                  )}
                </motion.article>
              )
            })}
          </motion.div>
        )}
      </div>
    </section>
  )
}

function SessionCtaLabel({
  isOpen,
  isSoldOut,
  isClosed,
}: {
  isOpen: boolean
  isSoldOut: boolean
  isClosed: boolean
}) {
  const tSessions = useTranslations('booking.sessions')
  const tShared = useTranslations('booking.reconsider')
  if (isOpen) return <span>{tSessions('reserve')}</span>
  if (isSoldOut) return <span>{tShared('panel_join_waitlist')}</span>
  if (isClosed) return <span>{tShared('panel_notify_me')}</span>
  return null
}

function SessionPill({
  isOpen,
  isSoldOut,
  isClosed,
  isLow,
  remaining,
  isRtl,
}: {
  isOpen: boolean
  isSoldOut: boolean
  isClosed: boolean
  isLow: boolean
  remaining: number
  isRtl: boolean
}) {
  const t = useTranslations('booking.sessions')
  const tShared = useTranslations('booking.reconsider')
  const baseClass = `inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
    isRtl
      ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold'
      : 'font-display'
  }`

  if (isOpen && isLow) {
    return (
      <span
        className={`${baseClass} bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-fg)]`}
      >
        {t('remaining_short', { n: remaining })}
      </span>
    )
  }
  if (isOpen) {
    return (
      <span
        className={`${baseClass} bg-[var(--color-accent-soft)] text-[var(--color-accent)]`}
      >
        {t('filter_open')}
      </span>
    )
  }
  if (isSoldOut) {
    return (
      <span
        className={`${baseClass} bg-[var(--color-status-soldout-bg)] text-[var(--color-status-soldout-fg)]`}
      >
        {tShared('panel_sold_out')}
      </span>
    )
  }
  if (isClosed) {
    return (
      <span
        className={`${baseClass} bg-[var(--color-bg-deep)] text-[var(--color-fg3)]`}
      >
        {t('filter_closed')}
      </span>
    )
  }
  return null
}
