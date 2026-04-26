'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { Ornament } from '@/components/shared/Ornament'
import { cn } from '@/lib/utils'

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]
const EASE_IN_OUT_QUART: [number, number, number, number] = [0.77, 0, 0.175, 1]

function LineReveal({
  children,
  delay,
  className,
}: {
  children: React.ReactNode
  delay: number
  className?: string
}) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className={cn('block', className)}
        initial={{ y: '102%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.95, ease: EASE_IN_OUT_QUART, delay }}
      >
        {children}
      </motion.span>
    </span>
  )
}

function CtaPill({
  href,
  children,
  delay,
  variant = 'outline',
}: {
  href: string
  children: React.ReactNode
  delay: number
  variant?: 'outline' | 'solid'
}) {
  return (
    <motion.span
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE_OUT_QUART, delay }}
      className="inline-block"
    >
      <Link
        href={href}
        className={cn(
          'inline-flex items-center gap-2 px-5 py-[10px] min-h-[42px] rounded-full border border-ink text-[13px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold [dir=rtl]:text-[13.5px]',
          variant === 'solid'
            ? 'bg-ink text-paper-soft hover:bg-brass-deep hover:border-brass-deep'
            : 'bg-transparent text-ink hover:bg-ink hover:text-paper-soft',
        )}
      >
        <span aria-hidden className="block h-[7px] w-[7px] rounded-full bg-current" />
        <span>{children}</span>
      </Link>
    </motion.span>
  )
}

export function Hero() {
  const locale = useLocale()
  const t = useTranslations('hero')
  const tCta = useTranslations('cta')
  const isRtl = locale === 'ar'

  // Pair the headline as: Italic line / Display line / Italic line / Display line.
  // Latin uses Fraunces + Instrument Serif italic; Arabic uses Reem Kufi.
  const lines = [
    { text: t('line_1'), style: 'display' as const },
    { text: t('line_2'), style: 'italic' as const },
    { text: t('line_3'), style: 'display' as const },
    { text: t('line_4'), style: 'italic' as const },
    { text: t('line_5'), style: 'display' as const },
  ]

  return (
    <section
      aria-label={t('section_label')}
      className="relative isolate overflow-hidden bg-paper pt-[88px] pb-[var(--spacing-xl)]"
    >
      {/* Sky/mauve vignette in upper-end corner so the portrait melts into paper */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
        style={{
          background:
            'radial-gradient(60% 50% at 80% 20%, rgba(168, 196, 214, 0.14) 0%, transparent 70%), radial-gradient(50% 40% at 10% 80%, rgba(90, 74, 85, 0.07) 0%, transparent 70%)',
        }}
      />

      <div className="container relative grid items-center gap-[var(--spacing-lg)] md:grid-cols-[1.18fr_1fr] md:gap-[var(--spacing-xl)]">
        <div className="text-start">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT_QUART, delay: 0.15 }}
            className="mb-7 flex items-baseline gap-3 text-ink-muted"
          >
            <Ornament glyph="fleuron" size={14} className="text-brass animate-flourish-pulse" />
            <span
              className="font-display font-medium text-[11px] tracking-[0.18em] uppercase [dir=rtl]:font-arabic [dir=rtl]:text-[13px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
            >
              .01 — {t('eyebrow')}
            </span>
          </motion.div>

          <h1 className={cn('flex flex-col text-balance', isRtl ? 'gap-1.5' : 'gap-0')}>
            {lines.map((line, i) => {
              const isItalic = line.style === 'italic' && !isRtl
              return (
                <LineReveal
                  key={i}
                  delay={0.32 + i * 0.11}
                  className={cn(
                    isRtl
                      ? 'text-[clamp(40px,7vw,84px)] leading-[1.08]'
                      : isItalic
                        ? 'text-[clamp(40px,6.6vw,96px)] leading-[1.0] italic'
                        : 'text-[clamp(44px,6.8vw,100px)] leading-[0.96] tracking-[-0.022em]',
                  )}
                >
                  <span
                    className={cn(
                      'font-normal',
                      isRtl
                        ? 'font-arabic-display font-medium text-ink'
                        : isItalic
                          ? 'font-serif italic text-garnet'
                          : 'font-display text-ink',
                    )}
                  >
                    {line.text}
                  </span>
                </LineReveal>
              )
            })}
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT_QUART, delay: 1.0 }}
            className="mt-[var(--spacing-md)] max-w-[58ch]"
          >
            <p
              className="text-pretty text-ink-soft font-display font-normal text-[17px] leading-[1.65] [dir=rtl]:font-arabic [dir=rtl]:leading-[1.95]"
            >
              {t('description')}
            </p>
          </motion.div>

          <div className="mt-[var(--spacing-lg)] flex flex-wrap items-center gap-3">
            <CtaPill href="/articles" delay={1.45} variant="outline">
              {tCta('articles')}
            </CtaPill>
            <CtaPill href="/books" delay={1.55} variant="solid">
              {tCta('books')}
            </CtaPill>
          </div>
        </div>

        {/* Portrait — printed frame with warm sepia duotone */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: EASE_IN_OUT_QUART, delay: 0.5 }}
          className="relative mx-auto w-full max-w-[520px]"
        >
          <div className="relative aspect-[3/4] frame-print">
            <div className="relative h-full w-full overflow-hidden">
              <Image
                src="/dr-khaled-portrait.jpg"
                alt={isRtl ? 'د. خالد غطاس' : 'Dr. Khaled Ghattass'}
                fill
                priority
                sizes="(min-width: 768px) 520px, 100vw"
                className="object-cover object-[center_top]"
              />
              {/* Soft cream + mauve wash on the inner edge — bleeds the portrait into the paper */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(115deg, rgba(240, 230, 216, 0.45) 0%, transparent 35%, transparent 70%, rgba(42, 37, 40, 0.15) 100%)',
                  mixBlendMode: 'multiply',
                }}
              />
            </div>
          </div>

          {/* Marginalia: handwritten-style attribution under the portrait */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="absolute -bottom-3 inset-inline-end-3 flex items-baseline gap-2 bg-paper px-2.5 py-1 text-ink-muted"
          >
            <Ornament glyph="asterism" size={12} className="text-brass" />
            <span
              className="font-display italic font-medium text-[10px] tracking-[0.14em] uppercase [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:text-[11px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
            >
              {isRtl ? 'صورة بورتريه — ٢٠٢٤' : 'Portrait — Beirut, 2024'}
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom rule with a centered fleuron — bridges into the next section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.7, duration: 0.6 }}
        className="container mt-[var(--spacing-xl)] flex items-center justify-center gap-4 text-ink-muted/40"
      >
        <span aria-hidden className="block h-px flex-1 bg-current" />
        <Ornament glyph="fleuron" size={18} className="text-brass animate-bob" />
        <span aria-hidden className="block h-px flex-1 bg-current" />
      </motion.div>
    </section>
  )
}
