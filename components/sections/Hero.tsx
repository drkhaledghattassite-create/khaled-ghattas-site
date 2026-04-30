'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion, useScroll, useTransform } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { useIsMobile, useReducedMotion } from '@/lib/motion/hooks'
import { EASE_EDITORIAL } from '@/lib/motion/variants'

type StatItem = {
  numLatn: string
  label: string
  hasPlus: boolean
}

type HeroProps = {
  showCtaBooks?: boolean
  showCtaArticles?: boolean
}

export function Hero({ showCtaBooks = true, showCtaArticles = true }: HeroProps = {}) {
  const locale = useLocale()
  const t = useTranslations('hero')
  const tCta = useTranslations('cta')
  const isRtl = locale === 'ar'
  const sectionRef = useRef<HTMLElement>(null)
  const isMobile = useIsMobile()
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const enableParallax = !isMobile && !reduceMotion
  const portraitY = useTransform(
    scrollYProgress,
    [0, 1],
    enableParallax ? ['0%', '6%'] : ['0%', '0%'],
  )

  const enableBreathe = !reduceMotion && !isMobile
  const enableBlur = !isMobile

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
      ref={sectionRef}
      id="top"
      aria-label={t('section_label')}
      data-bg="var(--color-bg)"
      className="qh-hero relative grid overflow-hidden border-b border-[var(--color-border)] md:grid-cols-2 md:min-h-[calc(100dvh-57px)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Portrait panel — full-bleed editorial split */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
        className="relative aspect-[4/3] md:aspect-auto md:min-h-[calc(100dvh-57px)] order-1 ltr:md:order-2 bg-[var(--color-bg-deep)] overflow-hidden"
      >
        {/* Parallax + ambient breathe wrapper */}
        <motion.div
          style={{ y: portraitY }}
          animate={enableBreathe ? { scale: [1, 1.006, 1] } : undefined}
          transition={
            enableBreathe
              ? { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }
              : undefined
          }
          className="absolute inset-0 will-change-transform"
        >
          {/* Blur reveal layer */}
          <motion.div
            initial={
              enableBlur
                ? { opacity: 0, scale: 1.06, filter: 'blur(8px)' }
                : { opacity: 0, scale: 1.04 }
            }
            animate={
              enableBlur
                ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
                : { opacity: 1, scale: 1 }
            }
            transition={{ duration: 1.0, ease: EASE_EDITORIAL, delay: 0.1 }}
            className="absolute inset-0"
          >
            <Image
              src="/dr-khaled-portrait.jpg"
              alt={t('portrait_alt')}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover object-[center_22%] [filter:saturate(0.78)_contrast(1.05)] dark:[filter:saturate(0.62)_contrast(1.08)_brightness(0.88)] transition-[filter] duration-[400ms]"
            />
          </motion.div>
        </motion.div>
        {/* Editorial vignette + warm wash */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none z-[1] [background:radial-gradient(ellipse_at_50%_28%,transparent_38%,rgba(20,15,10,0.22)_100%),linear-gradient(180deg,transparent_55%,rgba(20,15,10,0.40)_100%)] dark:[background:radial-gradient(ellipse_at_50%_28%,transparent_30%,rgba(0,0,0,0.45)_100%),linear-gradient(180deg,transparent_50%,rgba(0,0,0,0.55)_100%)]"
        />
        {/* Hairline divider on the side facing the content panel — desktop only */}
        <div
          aria-hidden
          className="hidden md:block absolute top-0 bottom-0 w-px bg-[var(--color-border)] z-[2] [inset-inline-end:0] ltr:[inset-inline-end:auto] ltr:[inset-inline-start:0]"
        />
        {/* Est stamp on photo */}
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_EDITORIAL, delay: 1.2 }}
          className={`absolute z-[3] [inset-block-end:20px] [inset-inline-start:20px] text-[10px] font-semibold tracking-[0.18em] uppercase text-white/75 ${
            isRtl ? 'font-arabic-body !text-[11px] !tracking-normal !normal-case !font-medium' : 'font-display'
          }`}
        >
          {established}
        </motion.span>
      </motion.div>

      {/* Content panel — DOM order 2; visually appears on left side via grid flow / order. */}
      <div className="flex flex-col justify-center order-2 ltr:md:order-1 [padding:clamp(48px,6vw,96px)_clamp(24px,5vw,72px)]">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_EDITORIAL, delay: 0.18 }}
          className={`inline-flex items-center gap-2.5 mb-7 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--color-fg3)] ${
            isRtl ? 'font-arabic-body !text-[12.5px] !tracking-[0.04em] !normal-case !font-bold' : 'font-display'
          }`}
        >
          <motion.span
            aria-hidden
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, ease: EASE_EDITORIAL, delay: 0.28 }}
            className="inline-block w-[7px] h-[7px] rounded-full bg-[var(--color-accent)] flex-shrink-0"
          />
          {t('eyebrow')}
        </motion.div>

        {/* Name — mask reveal bottom-to-top */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE_EDITORIAL, delay: 0.34 }}
          className={`m-0 mb-7 text-[clamp(52px,7.5vw,112px)] leading-[0.9] font-extrabold tracking-[-0.03em] text-[var(--color-fg1)] overflow-hidden pb-[0.16em] ${
            isRtl ? 'font-arabic-display !leading-[1.05]' : 'font-arabic-display !tracking-[-0.04em]'
          }`}
        >
          <motion.span
            initial={{ y: '110%' }}
            animate={{ y: '0%' }}
            transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
            className="block will-change-transform"
          >
            {name}
          </motion.span>
        </motion.h1>

        {/* Accent rule */}
        <motion.hr
          aria-hidden
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_EDITORIAL, delay: 0.7 }}
          className="block mb-7 w-12 h-[3px] bg-[var(--color-accent)] border-0"
          style={{ transformOrigin: isRtl ? 'right' : 'left' }}
        />

        {/* Statement */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_EDITORIAL, delay: 0.78 }}
          className={`m-0 mb-10 max-w-[480px] text-[clamp(15px,1.6vw,18px)] leading-[1.75] font-normal text-[var(--color-fg2)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('description')}
        </motion.p>

        {/* Stats trust band */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_EDITORIAL, delay: 0.92 }}
          className="grid grid-cols-2 sm:grid-cols-4 mb-9 border-y border-[var(--color-border)]"
        >
          {stats.map((s, idx) => {
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

        {/* CTAs — primary CTA gets magnetic effect */}
        {(showCtaBooks || showCtaArticles) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_EDITORIAL, delay: 1.08 }}
            className="flex flex-wrap items-center gap-2.5"
          >
            {showCtaBooks && (
              <Link href="/books" className="btn-pill btn-pill-accent">
                {tCta('books')}
              </Link>
            )}
            {showCtaArticles && (
              <Link href="/articles" className="btn-pill btn-pill-secondary">
                {tCta('articles')}
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </section>
  )
}
