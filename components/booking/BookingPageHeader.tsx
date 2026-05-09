'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { fadeUp, staggerContainerWith } from '@/lib/motion/variants'

type Props = {
  toursOpen: number
  sessionsOpen: number
  reconsiderState: 'open' | 'sold_out' | 'closed' | null
  reconsiderCohortLabel: string | null
}

/**
 * Page-cover header for /booking.
 *
 * Composition: eyebrow with leading rule, monumental h1, lead paragraph,
 * status strip with three microlines (one per section). Microlines flip
 * to a "quiet" treatment (border-strong dot instead of accent) when their
 * section has nothing open.
 */
export function BookingPageHeader({
  toursOpen,
  sessionsOpen,
  reconsiderState,
  reconsiderCohortLabel,
}: Props) {
  const t = useTranslations('booking')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  // Translate section open-state into copy. Plurals are flat sibling keys
  // in this project — `_one` / `_other` are NOT ICU plurals.
  const tourLine =
    toursOpen === 0
      ? t('status_strip.tours_none')
      : toursOpen === 1
      ? t('status_strip.tours_open_one', { count: toursOpen })
      : t('status_strip.tours_open_other', { count: toursOpen })

  const reconsiderLine =
    reconsiderState === 'open'
      ? t('status_strip.reconsider_open', {
          date: reconsiderCohortLabel ?? '',
        })
      : reconsiderState === 'sold_out'
      ? t('status_strip.reconsider_sold_out')
      : t('status_strip.reconsider_closed')

  const sessionsLine = t('status_strip.sessions_open', { open: sessionsOpen })

  const isReconsiderQuiet = reconsiderState !== 'open'
  const isToursQuiet = toursOpen === 0
  const isSessionsQuiet = sessionsOpen === 0

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={staggerContainerWith(0.08, 0.05)}
      className="border-b border-[var(--color-border)] [padding:clamp(56px,8vw,120px)_clamp(20px,5vw,56px)_clamp(40px,6vw,72px)]"
    >
      <div className="mx-auto max-w-[var(--container-max)]">
        <motion.span
          variants={fadeUp}
          className={`inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-fg3)] before:inline-block before:h-px before:w-6 before:bg-[var(--color-border-strong)] ${
            isRtl
              ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
              : 'font-display'
          }`}
        >
          {t('page.eyebrow')}
        </motion.span>

        <motion.h1
          variants={fadeUp}
          className={`m-0 mt-[18px] max-w-[900px] text-[clamp(40px,6.5vw,88px)] font-extrabold leading-[0.98] tracking-[-0.025em] text-[var(--color-fg1)] [text-wrap:balance] ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.035em]'
          }`}
        >
          {t('page.hero_italic')} {t('page.hero_sans')}
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className={`mt-7 max-w-[640px] text-[clamp(17px,1.6vw,19px)] leading-[1.65] text-[var(--color-fg2)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('page.lead')}
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3"
        >
          <StatusLine quiet={isToursQuiet} isRtl={isRtl}>
            {tourLine}
          </StatusLine>
          <StatusLine quiet={isReconsiderQuiet} isRtl={isRtl}>
            {reconsiderLine}
          </StatusLine>
          <StatusLine quiet={isSessionsQuiet} isRtl={isRtl}>
            {sessionsLine}
          </StatusLine>
        </motion.div>
      </div>
    </motion.section>
  )
}

function StatusLine({
  quiet,
  isRtl,
  children,
}: {
  quiet: boolean
  isRtl: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-fg2)] [font-feature-settings:'tnum'] ${
        isRtl
          ? 'font-arabic-body !text-[14px] !tracking-normal !normal-case !font-bold'
          : 'font-display'
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          quiet
            ? 'bg-[var(--color-border-strong)]'
            : 'bg-[var(--color-accent)]'
        }`}
      />
      {children}
    </span>
  )
}
