'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import {
  blurReveal,
  EASE_EDITORIAL,
  staggerContainer,
  staggerItem,
} from '@/lib/motion/variants'
import type { ComingSoonPage } from '@/lib/site-settings/types'

type Props = {
  pageKey: ComingSoonPage
  /**
   * Optional ISO date string ("2026-06-15"). When supplied, renders an
   * "Expected by …" line under the body. Localized via Intl.DateTimeFormat.
   */
  estimatedDate?: string | null
}

export function ComingSoon({ pageKey, estimatedDate }: Props) {
  const t = useTranslations('coming_soon')
  const tNewsletter = useTranslations('newsletter')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  const heading = t(`heading_${pageKey}`)
  const body = t(`body_${pageKey}`)
  const folio = t(`folio_${pageKey}`)
  const eyebrow = t('eyebrow')
  const notify = t('notify_me')

  let formattedDate: string | null = null
  if (estimatedDate) {
    const parsed = new Date(estimatedDate)
    if (!Number.isNaN(parsed.getTime())) {
      formattedDate = new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(parsed)
    }
  }

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      className="relative border-b border-[var(--color-border)] [padding:clamp(96px,12vw,160px)_clamp(20px,5vw,56px)] min-h-[calc(100dvh-160px)] flex items-center"
    >
      <div className="relative mx-auto w-full max-w-[var(--container-max)]">
        {/* Folio number — top corner */}
        <span
          aria-hidden
          className={`absolute top-0 [inset-inline-end:0] text-[11px] font-semibold tracking-[0.18em] text-[var(--color-fg3)] [font-feature-settings:'tnum'] num-latn ${
            isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !font-bold' : 'font-display'
          }`}
        >
          {folio}
        </span>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-7 max-w-[760px]"
        >
          {/* Eyebrow */}
          <motion.span
            variants={staggerItem}
            className="eyebrow-accent"
          >
            {eyebrow}
          </motion.span>

          {/* Monumental headline */}
          <motion.h1
            variants={blurReveal}
            className="m-0 text-[var(--color-fg1)] [text-wrap:balance] font-hero"
          >
            {heading}
          </motion.h1>

          {/* Accent rule */}
          <motion.span
            aria-hidden
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5, ease: EASE_EDITORIAL }}
            style={{ transformOrigin: isRtl ? 'right' : 'left' }}
            className="block w-[72px] h-[3px] bg-[var(--color-accent)]"
          />

          {/* Body */}
          <motion.p
            variants={staggerItem}
            className={`m-0 max-w-[58ch] text-[clamp(16px,1.6vw,18px)] leading-[1.7] text-[var(--color-fg2)] [text-wrap:pretty] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {body}
          </motion.p>

          {/* Estimated date */}
          {formattedDate && (
            <motion.p
              variants={staggerItem}
              className={`m-0 text-[14px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] num-latn ${
                isRtl ? 'font-arabic-body !text-[14px] !tracking-normal !normal-case !font-bold' : 'font-display'
              }`}
            >
              {t('expected_by', { date: formattedDate })}
            </motion.p>
          )}

          {/* Notify me — anchors to the homepage newsletter section */}
          <motion.div variants={staggerItem} className="pt-4">
            <Link
              href={{ pathname: '/', hash: 'newsletter' }}
              className="btn-pill btn-pill-accent"
              aria-label={notify}
            >
              {notify}
              <span aria-hidden>{isRtl ? '←' : '→'}</span>
            </Link>
            <span className="sr-only">{tNewsletter('cta')}</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
