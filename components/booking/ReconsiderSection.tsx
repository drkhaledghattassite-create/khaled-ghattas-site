'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowLeft, ArrowRight, CalendarCheck, Plus } from 'lucide-react'
import type { BookingWithHolds } from '@/lib/db/queries'
import { Link } from '@/lib/i18n/navigation'
import {
  reconsiderCurriculum,
  reconsiderFaq,
  reconsiderFormat,
  reconsiderInstructorNote,
  reconsiderOutcomes,
  reconsiderSchedule,
  reconsiderWhoFor,
} from '@/lib/booking/reconsider-content'

type Props = {
  reconsider: BookingWithHolds
  onReserve: () => void
  onInterest: (mode: 'sold_out' | 'closed') => void
  /**
   * Whether the Reconsider section is the currently-active scroll-spy
   * section. Drives the mobile-only sticky bottom CTA visibility — we only
   * surface it when the user is actually within Reconsider, so the bar
   * doesn't advertise this product while they're browsing Tours or Sessions.
   */
  isInView: boolean
  /**
   * When true, the user already paid for this booking. The Reserve panel +
   * mobile sticky CTA swap to "Already booked → view in dashboard."
   * Capacity / state metadata stays visible (other shoppers may still be
   * looking; the user can scroll the curriculum / FAQ).
   */
  isAlreadyBooked: boolean
  /**
   * Phase D — show "Send as gift" link beneath Reserve when the
   * `gifts.allow_user_to_user` site-setting is on. Always-on for the
   * Reconsider product (no gating beyond the global toggle).
   */
  allowGifting: boolean
}

function effectiveRemaining(b: BookingWithHolds): number {
  return Math.max(0, b.maxCapacity - b.bookedCount - b.activeHoldsCount)
}

function deriveState(b: BookingWithHolds): 'open' | 'sold_out' | 'closed' {
  if (b.bookingState === 'CLOSED') return 'closed'
  if (b.bookingState === 'SOLD_OUT') return 'sold_out'
  return effectiveRemaining(b) === 0 ? 'sold_out' : 'open'
}

function fmtPrice(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function fmtNumber(n: number, locale: string): string {
  return locale === 'ar' ? n.toLocaleString('ar-EG') : String(n)
}

export function ReconsiderSection({
  reconsider,
  onReserve,
  onInterest,
  isInView,
  isAlreadyBooked,
  allowGifting,
}: Props) {
  const t = useTranslations('booking.reconsider')
  const tShared = useTranslations('booking.shared')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [openFaq, setOpenFaq] = useState<number>(0)
  const ArrowFollow = isRtl ? ArrowLeft : ArrowRight

  const remaining = effectiveRemaining(reconsider)
  const state = deriveState(reconsider)
  const isOpen = state === 'open' && !isAlreadyBooked
  const isSoldOut = state === 'sold_out' && !isAlreadyBooked
  const isClosed = state === 'closed' && !isAlreadyBooked
  const isLow = isOpen && remaining > 0 && remaining <= 3

  const filledPct = Math.min(
    100,
    Math.round(
      ((reconsider.bookedCount + reconsider.activeHoldsCount) /
        reconsider.maxCapacity) *
        100,
    ),
  )

  const cohortLabel =
    (isRtl ? reconsider.cohortLabelAr : reconsider.cohortLabelEn) ?? ''
  const formatLabel =
    (isRtl ? reconsider.formatAr : reconsider.formatEn) ??
    (isRtl ? 'مباشر · أونلاين' : 'Live · Online')
  const tagline = t('tagline')
  const positioning = t('positioning')

  return (
    <section
      id="reconsider"
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
          </div>
          <div
            className={`flex flex-col gap-1.5 text-[13px] font-medium text-[var(--color-fg3)] [font-feature-settings:'tnum'] md:items-end ${
              isRtl ? 'font-arabic-body md:items-start' : 'font-display'
            }`}
          >
            <span>
              <strong className="font-bold text-[var(--color-fg1)] text-[14px]">
                {cohortLabel}
              </strong>
            </span>
            <span>${fmtPrice(reconsider.priceUsd)}</span>
          </div>
        </header>

        {/* Hero spread */}
        <div className="grid items-start gap-[clamp(32px,5vw,80px)] lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-7">
            <h3
              className={`relative m-0 -mt-2 text-[clamp(56px,9vw,128px)] font-black leading-[0.92] tracking-[-0.045em] text-[var(--color-fg1)] after:mt-6 after:block after:h-1 after:w-14 after:bg-[var(--color-accent)] after:content-[""] ${
                isRtl ? 'font-arabic-display' : 'font-arabic-display'
              }`}
            >
              {t('name')}
            </h3>
            <p
              className={`m-0 max-w-[520px] text-[clamp(20px,2.4vw,26px)] font-medium leading-[1.45] tracking-[-0.005em] text-[var(--color-fg1)] [text-wrap:pretty] ${
                isRtl
                  ? 'font-arabic-display'
                  : 'font-arabic-display !tracking-[-0.015em]'
              }`}
            >
              {tagline}
            </p>
            <p
              className={`m-0 max-w-[540px] text-[16px] leading-[1.7] text-[var(--color-fg2)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {positioning}
            </p>
          </div>

          {/* Reserve panel — sticky on desktop only */}
          <aside
            className="flex flex-col gap-5 self-start rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] [padding:clamp(24px,2.5vw,32px)] shadow-[var(--shadow-card)] lg:sticky lg:top-[132px]"
          >
            <div>
              <div
                className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] ${
                  isRtl
                    ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                    : 'font-display'
                }`}
              >
                {t('panel_price')}
              </div>
              <div
                className={`flex items-baseline text-[40px] font-bold leading-none tracking-[-0.02em] text-[var(--color-fg1)] [font-feature-settings:'tnum']`}
              >
                <span className="me-1 align-top text-[18px] font-medium text-[var(--color-fg3)]">
                  $
                </span>
                {fmtPrice(reconsider.priceUsd)}
              </div>
              {isOpen && !isSoldOut && (
                <>
                  <div
                    className={`mt-3 inline-flex items-center gap-2 text-[13.5px] before:h-1.5 before:w-1.5 before:rounded-full ${
                      isLow
                        ? 'text-[var(--color-status-warning-fg)] before:bg-[var(--color-status-warning-fg)]'
                        : 'text-[var(--color-fg2)] before:bg-[var(--color-accent)]'
                    } ${isRtl ? 'font-arabic-body' : 'font-display'}`}
                  >
                    {isLow
                      ? t('panel_seats_remaining_few', {
                          n: fmtNumber(remaining, locale),
                        })
                      : remaining === 1
                      ? t('panel_seats_remaining_one', {
                          n: fmtNumber(remaining, locale),
                        })
                      : t('panel_seats_remaining_other', {
                          n: fmtNumber(remaining, locale),
                        })}
                    <span className="ms-1 font-normal text-[var(--color-fg3)]">
                      ·{' '}
                      {t('panel_of_capacity', {
                        cap: fmtNumber(reconsider.maxCapacity, locale),
                      })}
                    </span>
                  </div>
                  <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-[var(--color-bg-deep)]">
                    <div
                      className={`h-full transition-[width] duration-500 ${
                        isLow
                          ? 'bg-[var(--color-status-warning-fg)]'
                          : 'bg-[var(--color-accent)]'
                      }`}
                      style={{ width: `${filledPct}%` }}
                    />
                  </div>
                </>
              )}
              {isSoldOut && (
                <div
                  className={`mt-3 inline-flex items-center gap-2 text-[13.5px] font-semibold text-[var(--color-status-soldout-fg)] before:h-1.5 before:w-1.5 before:rounded-full before:bg-[var(--color-status-soldout-fg)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('panel_sold_out')}
                </div>
              )}
              {isClosed && (
                <div
                  className={`mt-3 inline-flex items-center gap-2 text-[13.5px] text-[var(--color-fg3)] before:h-1.5 before:w-1.5 before:rounded-full before:bg-[var(--color-border-strong)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('closed_heading')}
                </div>
              )}
              {isAlreadyBooked && (
                <div
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[12px] font-bold text-[var(--color-accent)] ${
                    isRtl
                      ? 'font-arabic-body !text-[13px]'
                      : 'font-display'
                  }`}
                >
                  <CalendarCheck className="h-3 w-3" aria-hidden />
                  {tShared('already_booked')}
                </div>
              )}
            </div>

            <div className="my-1 h-px bg-[var(--color-border)]" />

            <PanelRow label={t('panel_next_cohort')} value={cohortLabel} isRtl={isRtl} />
            <PanelRow
              label={t('panel_duration')}
              value={
                isRtl ? '٨ أسابيع' : '8 weeks'
              }
              isRtl={isRtl}
            />
            <PanelRow label={t('panel_delivery')} value={formatLabel} isRtl={isRtl} />

            <div className="my-1 h-px bg-[var(--color-border)]" />

            {isOpen && !isSoldOut && (
              <>
                <button
                  type="button"
                  onClick={onReserve}
                  className={`mt-1 w-full rounded-full bg-[var(--color-fg1)] px-6 py-4 text-[15px] font-semibold text-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('panel_reserve_cta')}
                </button>
                {/* Phase D — gifting CTA mirrors the link on /books/[slug]
                    and pre-selects the Reconsider course via query params.
                    Rendered as a subtle text link beneath Reserve so it
                    discovers the feature without competing with the
                    primary purchase CTA. */}
                {allowGifting && (
                  <Link
                    href={`/gifts/send?type=booking&id=${reconsider.id}`}
                    className={`text-center text-[13px] underline text-[var(--color-fg2)] hover:text-[var(--color-fg1)] transition-colors ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {tShared('send_as_gift')}
                  </Link>
                )}
                <p
                  className={`text-center text-[12px] leading-[1.5] text-[var(--color-fg3)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('panel_reserve_foot')}
                </p>
              </>
            )}
            {isSoldOut && (
              <>
                <button
                  type="button"
                  onClick={() => onInterest('sold_out')}
                  className={`mt-1 w-full rounded-full border border-[var(--color-fg1)] bg-transparent px-6 py-4 text-[15px] font-semibold text-[var(--color-fg1)] transition-colors hover:bg-[var(--color-fg1)] hover:text-[var(--color-bg)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('panel_join_waitlist')}
                </button>
                <p
                  className={`text-center text-[12px] leading-[1.5] text-[var(--color-fg3)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('panel_join_waitlist_foot')}
                </p>
              </>
            )}
            {isClosed && (
              <>
                <p
                  className={`text-[14px] leading-[1.6] text-[var(--color-fg2)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('closed_body')}
                </p>
                <button
                  type="button"
                  onClick={() => onInterest('closed')}
                  className={`w-full rounded-full border border-[var(--color-fg1)] bg-transparent px-6 py-4 text-[15px] font-semibold text-[var(--color-fg1)] transition-colors hover:bg-[var(--color-fg1)] hover:text-[var(--color-bg)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('panel_notify_me')}
                </button>
              </>
            )}
            {isAlreadyBooked && (
              <>
                <p
                  className={`text-[14px] leading-[1.6] text-[var(--color-fg2)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {tShared('already_booked_body')}
                </p>
                <Link
                  href="/dashboard/bookings"
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-fg1)] px-6 py-4 text-[15px] font-semibold text-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {tShared('view_in_dashboard')}
                  <ArrowFollow aria-hidden className="h-4 w-4" />
                </Link>
              </>
            )}
          </aside>
        </div>

        {/* Detail blocks */}
        <div className="mt-[clamp(64px,7vw,96px)] grid grid-cols-1 gap-[clamp(56px,6vw,80px)]">
          {/* Who for */}
          <DetailBlock label={t('block_who_for')} isRtl={isRtl}>
            <p
              className={`m-0 max-w-[720px] text-[17px] leading-[1.7] text-[var(--color-fg1)] [text-wrap:pretty] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {isRtl ? reconsiderWhoFor.ar : reconsiderWhoFor.en}
            </p>
          </DetailBlock>

          {/* Curriculum */}
          <DetailBlock label={t('block_curriculum')} isRtl={isRtl}>
            <ol className="m-0 grid list-none grid-cols-1 gap-0 p-0">
              {reconsiderCurriculum.map((mod, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[auto_1fr] items-baseline gap-5 border-b border-[var(--color-border)] py-[18px] first:border-t first:border-[var(--color-border)]"
                >
                  <span
                    className={`pt-1 text-[12px] font-semibold tracking-[0.04em] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {t('module_n', {
                      n: isRtl
                        ? fmtNumber(i + 1, locale)
                        : String(i + 1).padStart(2, '0'),
                    })}
                  </span>
                  <span
                    className={`text-[19px] font-semibold leading-[1.4] text-[var(--color-fg1)] [text-wrap:balance] ${
                      isRtl
                        ? 'font-arabic-display'
                        : 'font-arabic-display !tracking-[-0.01em]'
                    }`}
                  >
                    {isRtl ? mod.titleAr : mod.titleEn}
                  </span>
                </li>
              ))}
            </ol>
          </DetailBlock>

          {/* Format
              Two-column grid where odd-indexed children (1st, 3rd, 5th in
              CSS `:nth-child(odd)` — array indices 0, 2, 4 — i.e. the
              leading-edge column) get a trailing border + trailing padding,
              and even-indexed children (the trailing column) get leading
              padding. Expressed as Tailwind arbitrary selectors on the parent
              so the children stay declarative — no per-cell ternary. */}
          <DetailBlock label={t('block_format')} isRtl={isRtl}>
            <div className="grid grid-cols-2 gap-0 border-t border-[var(--color-border)] [&>*]:border-b [&>*]:border-[var(--color-border)] [&>*]:py-6 [&>:nth-child(odd)]:border-e [&>:nth-child(odd)]:border-[var(--color-border)] sm:[&>:nth-child(odd)]:pe-6 sm:[&>:nth-child(even)]:ps-6">
              {reconsiderFormat.map((cell) => (
                <div key={cell.labelEn}>
                  <div
                    className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] ${
                      isRtl
                        ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                        : 'font-display'
                    }`}
                  >
                    {isRtl ? cell.labelAr : cell.labelEn}
                  </div>
                  <div
                    className={`text-[22px] font-bold tracking-[-0.005em] text-[var(--color-fg1)] ${
                      isRtl
                        ? 'font-arabic-display'
                        : 'font-arabic-display !tracking-[-0.015em]'
                    }`}
                  >
                    {isRtl ? cell.valueAr : cell.valueEn}
                  </div>
                </div>
              ))}
            </div>
          </DetailBlock>

          {/* Schedule */}
          <DetailBlock label={t('block_schedule')} isRtl={isRtl}>
            <ol className="m-0 grid list-none grid-cols-1 p-0">
              {reconsiderSchedule.map((entry, i) => (
                <li
                  key={i}
                  // Mobile: 2-col grid — week label | (title + date stacked).
                  // The date moves under the title so neither overflows when
                  // the title is long Arabic. Desktop (sm+): restores the
                  // 3-col layout with date pinned to the trailing edge.
                  className="grid grid-cols-[64px_1fr] items-baseline gap-x-4 gap-y-1 border-b border-[var(--color-border)] py-[18px] first:border-t first:border-[var(--color-border)] sm:grid-cols-[80px_1fr_auto] sm:items-center sm:gap-6 sm:gap-y-0"
                >
                  <span
                    className={`text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-fg3)] [font-feature-settings:'tnum'] sm:row-span-1 ${
                      isRtl
                        ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                        : 'font-display'
                    }`}
                  >
                    {isRtl ? entry.weekAr : entry.weekEn}
                  </span>
                  <span
                    className={`text-[17px] font-semibold leading-[1.4] text-[var(--color-fg1)] [text-wrap:balance] ${
                      isRtl
                        ? 'font-arabic-display'
                        : 'font-arabic-display !tracking-[-0.005em]'
                    }`}
                  >
                    {isRtl ? entry.titleAr : entry.titleEn}
                  </span>
                  {/* Mobile: date sits in column 2, row 2 (under the title).
                     Desktop: date sits in column 3, no row override needed. */}
                  <span
                    className={`col-start-2 text-[13px] text-[var(--color-fg3)] [font-feature-settings:'tnum'] sm:col-start-auto sm:whitespace-nowrap ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {isRtl ? entry.dateAr : entry.dateEn}
                  </span>
                </li>
              ))}
            </ol>
          </DetailBlock>

          {/* Outcomes */}
          <DetailBlock label={t('block_outcomes')} isRtl={isRtl}>
            {/*
             * Bullet rendered as a real span in the grid's auto column —
             * NOT as a `before:` pseudo on the LI (which previously broke:
             * the LI is itself a CSS-grid container, so `before:` content
             * became its own grid cell on a new line above the text).
             */}
            <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0">
              {reconsiderOutcomes.map((o, i) => (
                <li
                  key={i}
                  className={`grid max-w-[680px] grid-cols-[auto_1fr] items-baseline gap-4 text-[16px] leading-[1.6] text-[var(--color-fg1)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  <span
                    aria-hidden
                    className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
                  />
                  <span>{isRtl ? o.ar : o.en}</span>
                </li>
              ))}
            </ul>
          </DetailBlock>

          {/* Note from Khaled */}
          <DetailBlock label={t('block_note')} isRtl={isRtl}>
            <div className="grid max-w-[780px] grid-cols-[64px_1fr] items-start gap-5">
              <div className="relative h-16 w-16 overflow-hidden rounded-full bg-[var(--color-bg-deep)]">
                <Image
                  src="/dr khaled photo.jpeg"
                  alt="Dr. Khaled Ghattass"
                  fill
                  sizes="64px"
                  className="object-cover [object-position:center_20%]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p
                  className={`m-0 text-[18px] font-normal leading-[1.65] text-[var(--color-fg1)] [text-wrap:pretty] ${
                    isRtl ? 'font-arabic-display' : 'font-arabic-display'
                  }`}
                >
                  {isRtl ? reconsiderInstructorNote.ar : reconsiderInstructorNote.en}
                </p>
                <span
                  className={`text-[12px] tracking-[0.04em] text-[var(--color-fg3)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {isRtl
                    ? reconsiderInstructorNote.by.ar
                    : reconsiderInstructorNote.by.en}
                </span>
              </div>
            </div>
          </DetailBlock>

          {/*
           * Mobile sticky bottom Reserve CTA.
           *
           * Below `lg`, the reserve panel stacks above the 7 detail blocks —
           * so once a user scrolls into the curriculum / FAQ they have no way
           * to act without scrolling back. This bar gives them a permanent
           * action target on phones. Hidden on lg+ where the reserve panel
           * is sticky-side-rail and always visible.
           *
           * Three states: open → primary Reserve, sold-out → outline Waitlist,
           * closed → outline Notify. Matches the panel's CTA logic exactly.
           */}
          <div
            aria-hidden={!isInView}
            // Slide off-screen when user leaves the Reconsider section, so
            // the bar doesn't pollute Tours / Sessions context. `pointer-
            // events-none` while hidden so phantom taps don't intercept the
            // page.
            className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]/95 [padding:12px_clamp(20px,5vw,56px)] [padding-bottom:max(12px,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden ${
              isInView
                ? 'translate-y-0 pointer-events-auto'
                : 'translate-y-full pointer-events-none'
            }`}
            data-hide-in-focus="true"
          >
            <div className="mx-auto flex max-w-[var(--container-max)] items-center justify-between gap-3">
              <div className="flex flex-col leading-tight">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] ${
                    isRtl
                      ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold'
                      : 'font-display'
                  }`}
                >
                  Reconsider
                </span>
                <span className="flex items-baseline gap-1 text-[20px] font-bold text-[var(--color-fg1)] [font-feature-settings:'tnum']">
                  <span className="text-[12px] font-medium text-[var(--color-fg3)]">
                    $
                  </span>
                  {fmtPrice(reconsider.priceUsd)}
                </span>
              </div>
              {isOpen && !isSoldOut && (
                <button
                  type="button"
                  onClick={onReserve}
                  className={`inline-flex min-h-[48px] flex-shrink-0 items-center rounded-full bg-[var(--color-fg1)] px-6 text-[15px] font-semibold text-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent)] active:translate-y-[1px] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('panel_reserve_cta')}
                </button>
              )}
              {isSoldOut && (
                <button
                  type="button"
                  onClick={() => onInterest('sold_out')}
                  className={`inline-flex min-h-[48px] flex-shrink-0 items-center rounded-full border border-[var(--color-fg1)] px-6 text-[14px] font-semibold text-[var(--color-fg1)] transition-colors hover:bg-[var(--color-fg1)] hover:text-[var(--color-bg)] active:translate-y-[1px] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('panel_join_waitlist')}
                </button>
              )}
              {isClosed && (
                <button
                  type="button"
                  onClick={() => onInterest('closed')}
                  className={`inline-flex min-h-[48px] flex-shrink-0 items-center rounded-full border border-[var(--color-fg1)] px-6 text-[14px] font-semibold text-[var(--color-fg1)] transition-colors hover:bg-[var(--color-fg1)] hover:text-[var(--color-bg)] active:translate-y-[1px] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('panel_notify_me')}
                </button>
              )}
              {isAlreadyBooked && (
                <Link
                  href="/dashboard/bookings"
                  className={`inline-flex min-h-[48px] flex-shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-fg1)] px-6 text-[14px] font-semibold text-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent)] active:translate-y-[1px] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {tShared('view_in_dashboard')}
                  <ArrowFollow aria-hidden className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>

          {/* FAQ */}
          <DetailBlock label={t('block_faq')} isRtl={isRtl}>
            <ul className="m-0 grid list-none grid-cols-1 p-0">
              {reconsiderFaq.map((item, i) => {
                const expanded = openFaq === i
                return (
                  <li
                    key={i}
                    className="border-b border-[var(--color-border)] first:border-t first:border-[var(--color-border)]"
                  >
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpenFaq(expanded ? -1 : i)}
                      className={`flex w-full items-center justify-between gap-4 bg-transparent py-[22px] text-start text-[17px] font-semibold text-[var(--color-fg1)] ${
                        isRtl
                          ? 'font-arabic-body'
                          : 'font-display !tracking-[-0.005em]'
                      }`}
                    >
                      <span>
                        {isRtl ? item.questionAr : item.questionEn}
                      </span>
                      <span
                        aria-hidden
                        className={`inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center transition-transform duration-300 ${
                          expanded
                            ? 'rotate-45 text-[var(--color-accent)]'
                            : 'text-[var(--color-fg3)]'
                        }`}
                      >
                        <Plus className="h-4 w-4" />
                      </span>
                    </button>
                    {expanded && (
                      <div
                        className={`max-w-[760px] pb-[22px] text-[16px] leading-[1.7] text-[var(--color-fg2)] ${
                          isRtl ? 'font-arabic-body' : 'font-display'
                        }`}
                      >
                        {isRtl ? item.answerAr : item.answerEn}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </DetailBlock>
        </div>
      </div>
    </section>
  )
}

function PanelRow({
  label,
  value,
  isRtl,
}: {
  label: string
  value: string
  isRtl: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] ${
          isRtl
            ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
            : 'font-display'
        }`}
      >
        {label}
      </span>
      <span
        className={`text-end text-[16px] font-semibold text-[var(--color-fg1)] [font-feature-settings:'tnum'] ${
          isRtl ? 'font-arabic-display' : 'font-arabic-display'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function DetailBlock({
  label,
  isRtl,
  children,
}: {
  label: string
  isRtl: boolean
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-4 border-t border-[var(--color-border)] [padding-top:32px] md:grid-cols-[220px_1fr] md:gap-[clamp(24px,4vw,56px)]">
      <div
        className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] ${
          isRtl
            ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
            : 'font-display'
        }`}
      >
        {label}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}
