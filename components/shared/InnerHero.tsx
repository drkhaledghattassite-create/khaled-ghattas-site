'use client'

import Image from 'next/image'
import { useLocale } from 'next-intl'
import { motion } from 'motion/react'
import { Ornament } from '@/components/shared/Ornament'

const EASE_IN_OUT_QUART: [number, number, number, number] = [0.77, 0, 0.175, 1]

type Props = {
  eyebrow?: string
  headingItalic?: string
  headingSans: string
  description?: string
  image?: { src: string; alt: string }
  align?: 'start' | 'center'
  chapterNumber?: string
}

/**
 * Inner page hero — the journal-chapter opener for /about, /articles, etc.
 * Brass fleuron + chapter number eyebrow, mask-revealed heading pair,
 * optional duotone portrait inside a printed frame, generous lead text.
 */
export function InnerHero({
  eyebrow,
  headingItalic,
  headingSans,
  description,
  image,
  align = 'start',
  chapterNumber,
}: Props) {
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const alignClass = align === 'center' ? 'items-center text-center' : 'items-start text-start'

  return (
    <section className="relative z-[2] overflow-hidden bg-paper px-[var(--section-pad-x)] pt-[calc(var(--section-pad-y)+44px)] pb-[var(--spacing-xl)]">
      {/* Soft top vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50% 35% at 80% 0%, rgba(168, 196, 214, 0.10) 0%, transparent 70%)',
        }}
      />

      <div
        className={`relative mx-auto grid max-w-[1280px] gap-[var(--spacing-lg)] ${image ? 'md:grid-cols-[1.2fr_1fr] md:gap-[var(--spacing-xl)]' : ''}`}
      >
        <div className={`flex flex-col gap-[var(--spacing-md)] ${alignClass}`}>
          {eyebrow && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
              className={`flex items-baseline gap-3 text-ink-muted ${align === 'center' ? 'justify-center' : ''}`}
            >
              <Ornament glyph="fleuron" size={14} className="text-brass animate-flourish-pulse" />
              <span
                className="text-[11px] tracking-[0.2em] uppercase"
                style={{
                  fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
                  fontStyle: isRtl ? 'normal' : 'italic',
                  fontWeight: 500,
                  letterSpacing: isRtl ? 0 : '0.18em',
                  textTransform: isRtl ? 'none' : 'uppercase',
                  fontSize: isRtl ? 13 : 11,
                }}
              >
                {chapterNumber ? `${chapterNumber} — ${eyebrow}` : eyebrow}
              </span>
            </motion.div>
          )}
          <h1 className="m-0 space-y-2 text-balance">
            {headingItalic && (
              <MaskedLine delay={0}>
                <span
                  className="text-garnet"
                  style={{
                    fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
                    fontStyle: isRtl ? 'normal' : 'italic',
                    fontWeight: isRtl ? 600 : 400,
                    fontSize: 'clamp(32px, 5.6vw, 72px)',
                    lineHeight: 1.05,
                    letterSpacing: isRtl ? 0 : '-0.005em',
                  }}
                >
                  {headingItalic}
                </span>
              </MaskedLine>
            )}
            <MaskedLine delay={headingItalic ? 0.18 : 0}>
              <span
                className="text-ink"
                style={{
                  fontFamily: isRtl ? 'var(--font-arabic-display)' : 'var(--font-display)',
                  fontWeight: isRtl ? 500 : 400,
                  fontSize: 'clamp(40px, 7vw, 96px)',
                  lineHeight: 0.96,
                  letterSpacing: isRtl ? 0 : '-0.024em',
                }}
              >
                {headingSans}
              </span>
            </MaskedLine>
          </h1>

          {description && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
              className={`max-w-[58ch] text-pretty text-ink-soft ${align === 'center' ? 'mx-auto' : ''}`}
              style={{
                fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
                fontSize: isRtl ? 17 : 17,
                lineHeight: isRtl ? 1.95 : 1.6,
              }}
            >
              {description}
            </motion.p>
          )}
        </div>

        {image && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: EASE_IN_OUT_QUART, delay: 0.5 }}
            className="relative mx-auto w-full max-w-[520px]"
          >
            <div className="frame-print relative aspect-[3/4]">
              <div className="relative h-full w-full overflow-hidden">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  priority
                  sizes="(min-width: 768px) 520px, 100vw"
                  className="object-cover object-center duotone-warm"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}

function MaskedLine({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <span className="relative block overflow-hidden">
      <motion.span
        className="relative inline-block"
        initial={{ y: '102%', opacity: 0 }}
        whileInView={{ y: '0%', opacity: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.95, delay, ease: EASE_IN_OUT_QUART }}
      >
        {children}
      </motion.span>
    </span>
  )
}
