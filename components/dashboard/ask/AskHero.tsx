'use client'

/**
 * Phase B1 — editorial hero for /dashboard/ask.
 *
 * Two-column on desktop (text on the leading edge, signed note on the
 * trailing); single-column on mobile. The signed note is the design's
 * intimate "letter from Dr. Khaled" treatment — a small portrait, a friendly
 * greeting, and a short manifesto about how the channel works.
 *
 * The design's analytics meta strip (median reply time, % answered, # this
 * month) is intentionally omitted in v1 — without real aggregates those
 * numbers would be cosmetic claims, not honest data. Phase B2 admin can wire
 * them when there's a real signal to surface.
 */

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { fadeUp, staggerContainer, EASE_EDITORIAL } from '@/lib/motion/variants'

type Props = {
  locale: 'ar' | 'en'
  userFirstName: string
}

export function AskHero({ locale, userFirstName }: Props) {
  const t = useTranslations('dashboard.ask.hero')
  const isRtl = locale === 'ar'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  // Greeting uses the user's first name when available; falls back to a
  // generic eyebrow when we have nothing to address them by.
  const greeting = userFirstName
    ? t('greeting_named', { name: userFirstName })
    : t('greeting_generic')

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-[clamp(32px,5vw,80px)] items-stretch pb-[clamp(48px,6vw,80px)] mb-[clamp(40px,5vw,64px)] border-b border-[var(--color-border)] lg:[grid-template-columns:1.4fr_1fr]"
    >
      {/* Text column */}
      <motion.div
        variants={fadeUp}
        transition={{ duration: 0.7, ease: EASE_EDITORIAL }}
        className="flex flex-col justify-center gap-6 max-w-[60ch]"
      >
        <span
          className={`inline-flex items-center gap-2.5 text-[var(--color-accent)] ${
            isRtl
              ? 'font-arabic-body text-[13px] font-bold'
              : 'font-display text-[11px] font-bold uppercase tracking-[0.16em]'
          }`}
        >
          <span
            aria-hidden
            className="inline-block h-px w-6 bg-[var(--color-accent)]"
          />
          {greeting}
        </span>

        {/* h2 (not h1) — DashboardLayout already renders the page <h1>
            for the user's display name (the avatar header). Two h1s would
            break the heading outline (WCAG 1.3.1 / 2.4.6). */}
        <h2
          className={`m-0 text-[clamp(36px,5.5vw,64px)] leading-[1.1] tracking-[-0.01em] [text-wrap:balance] text-[var(--color-fg1)] font-arabic-display ${
            isRtl ? '' : '!tracking-[-0.025em]'
          }`}
        >
          {t('title_a')} <span className="text-[var(--color-accent)]">{t('title_b')}</span>
        </h2>

        <p
          className={`m-0 max-w-[52ch] text-[var(--color-fg2)] ${
            isRtl
              ? 'font-arabic-body text-[17px] leading-[1.85]'
              : 'font-display text-[clamp(16px,1.4vw,18px)] leading-[1.7]'
          }`}
        >
          {t('lede')}
        </p>
      </motion.div>

      {/* Signed note card */}
      <motion.aside
        variants={fadeUp}
        transition={{ duration: 0.7, ease: EASE_EDITORIAL, delay: 0.1 }}
        aria-label={t('note_aria')}
        className="relative flex flex-col gap-[18px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-[clamp(24px,3vw,36px)] shadow-[var(--shadow-card)]"
      >
        {/* Top accent rule — sits on the leading edge of the card */}
        <span
          aria-hidden
          className="absolute top-[-1px] start-[clamp(24px,3vw,36px)] inline-block h-[3px] w-12 bg-[var(--color-accent)]"
        />

        <div className="flex items-center gap-3.5">
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-bg-deep)]">
            <Image
              src="/dr-khaled-portrait.jpg"
              alt=""
              fill
              sizes="56px"
              className="object-cover [object-position:center_22%] [filter:saturate(0.85)]"
            />
          </span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <strong
              className="text-[16px] font-bold text-[var(--color-fg1)] font-arabic-display"
            >
              {t('note_name')}
            </strong>
            <span
              className={`text-[12.5px] text-[var(--color-fg3)] ${fontBody}`}
            >
              {t('note_role')}
            </span>
          </div>
        </div>

        <p
          className={`m-0 text-[var(--color-fg2)] ${
            isRtl
              ? 'font-arabic-body text-[16px] leading-[1.85]'
              : 'font-display text-[15px] leading-[1.7]'
          }`}
        >
          {t('note_body')}
        </p>

        <div
          className={`flex items-center justify-between gap-4 pt-3.5 border-t border-[var(--color-border)] text-[13px] text-[var(--color-fg3)] ${fontBody}`}
        >
          <span>{t('channels')}</span>
        </div>
      </motion.aside>
    </motion.section>
  )
}
