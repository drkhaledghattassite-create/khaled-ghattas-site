'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

type StatItem = {
  numLatn: string
  label: string
  hasPlus: boolean
}

export function Hero() {
  const locale = useLocale()
  const t = useTranslations('hero')
  const tCta = useTranslations('cta')
  const isRtl = locale === 'ar'

  const name = t('name')
  const established = t('established')

  const stats: StatItem[] = [
    { numLatn: '15', label: t('stats.years'), hasPlus: true },
    { numLatn: '1000', label: t('stats.lectures'), hasPlus: true },
    { numLatn: '5', label: t('stats.books'), hasPlus: true },
    { numLatn: '6', label: t('stats.works'), hasPlus: false },
  ]

  return (
    <section
      id="top"
      aria-label={t('section_label')}
      className="qh-hero relative grid overflow-hidden border-b border-[var(--color-border)] md:grid-cols-2 md:min-h-[calc(100dvh-57px)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Portrait panel — full-bleed editorial split.
          DOM order: portrait first. With CSS Grid + dir attribute:
            • In RTL: first child (portrait) lands on right column → photo on right.
            • In LTR: order:2 forces portrait to right column → photo on right. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.85, ease: EASE }}
        className="relative aspect-[4/3] md:aspect-auto md:min-h-[calc(100dvh-57px)] order-1 ltr:md:order-2 bg-[var(--color-bg-deep)] overflow-hidden"
      >
        <Image
          src="/dr-khaled-portrait.jpg"
          alt={t('portrait_alt')}
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover object-[center_22%] [filter:saturate(0.78)_contrast(1.05)] dark:[filter:saturate(0.62)_contrast(1.08)_brightness(0.88)] transition-[filter] duration-[400ms]"
        />
        {/* Editorial vignette + warm wash */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none z-[1] [background:radial-gradient(ellipse_at_50%_28%,transparent_38%,rgba(20,15,10,0.22)_100%),linear-gradient(180deg,transparent_55%,rgba(20,15,10,0.40)_100%)]"
        />
        {/* Hairline divider on the side facing the content panel — desktop only */}
        <div
          aria-hidden
          className="hidden md:block absolute top-0 bottom-0 w-px bg-[var(--color-border)] z-[2] [inset-inline-end:0] ltr:[inset-inline-end:auto] ltr:[inset-inline-start:0]"
        />
        {/* Est stamp on photo */}
        <span
          className={`absolute z-[3] [inset-block-end:20px] [inset-inline-start:20px] text-[10px] font-semibold tracking-[0.18em] uppercase text-white/75 ${
            isRtl ? 'font-arabic-body !text-[11px] !tracking-normal !normal-case !font-medium' : 'font-display'
          }`}
        >
          {established}
        </span>
      </motion.div>

      {/* Content panel — DOM order 2; visually appears on left side via grid flow / order. */}
      <div className="flex flex-col justify-center order-2 ltr:md:order-1 [padding:clamp(48px,6vw,96px)_clamp(24px,5vw,72px)]">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.08 }}
          className={`inline-flex items-center gap-2.5 mb-7 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--color-fg3)] ${
            isRtl ? 'font-arabic-body !text-[12.5px] !tracking-[0.04em] !normal-case !font-bold' : 'font-display'
          }`}
        >
          <span aria-hidden className="inline-block w-[7px] h-[7px] rounded-full bg-[var(--color-accent)] flex-shrink-0" />
          {t('eyebrow')}
        </motion.div>

        {/* Name */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.24 }}
          className={`m-0 mb-7 text-[clamp(52px,7.5vw,112px)] leading-[0.9] font-extrabold tracking-[-0.03em] text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.04em]'
          }`}
        >
          {name}
        </motion.h1>

        {/* Accent rule */}
        <motion.hr
          aria-hidden
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
          className="block mb-7 w-12 h-[3px] bg-[var(--color-accent)] border-0"
          style={{ transformOrigin: isRtl ? 'right' : 'left' }}
        />

        {/* Statement */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.56 }}
          className={`m-0 mb-10 max-w-[480px] text-[clamp(15px,1.6vw,18px)] leading-[1.75] font-normal text-[var(--color-fg2)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('description')}
        </motion.p>

        {/* Stats trust band */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.8 }}
          className="grid grid-cols-2 sm:grid-cols-4 mb-9 border-y border-[var(--color-border)]"
        >
          {stats.map((s, idx) => {
            // Mobile (2-col): border-e on idx 0, 2 only.
            // Desktop (4-col): border-e on idx 0, 1, 2 only.
            const mobileBorder = idx % 2 === 0 ? 'border-e' : ''
            const desktopBorder = idx < 3 ? 'sm:border-e' : 'sm:border-e-0'
            return (
            <div
              key={s.label}
              className={`flex flex-col gap-1 py-[18px] ${mobileBorder} ${desktopBorder} border-[var(--color-border)]`}
            >
              <span
                className={`text-[clamp(22px,2.5vw,32px)] leading-none font-extrabold tracking-[-0.03em] text-[var(--color-fg1)] [font-feature-settings:'tnum'] ${
                  isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.03em]'
                }`}
              >
                <span dir="ltr" className="inline-block num-latn">
                  {s.numLatn}
                  {s.hasPlus && <span className="text-[var(--color-accent)]">+</span>}
                </span>
              </span>
              <span
                className={`text-[11px] leading-[1.4] text-[var(--color-fg3)] ${
                  isRtl ? 'font-arabic-body' : 'font-display !tracking-[0.02em]'
                }`}
              >
                {s.label}
              </span>
            </div>
            )
          })}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 1.04 }}
          className="flex flex-wrap items-center gap-2.5"
        >
          <Link href="/books" className="btn-pill btn-pill-accent">
            {tCta('books')}
          </Link>
          <Link href="/articles" className="btn-pill btn-pill-secondary">
            {tCta('articles')}
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
