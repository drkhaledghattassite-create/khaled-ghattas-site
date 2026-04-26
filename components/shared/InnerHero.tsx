'use client'

import Image from 'next/image'
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
                className="font-display italic font-medium text-[11px] tracking-[0.18em] uppercase [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:text-[13px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
              >
                {chapterNumber ? `${chapterNumber} — ${eyebrow}` : eyebrow}
              </span>
            </motion.div>
          )}
          <h1 className="m-0 space-y-2 text-balance">
            {headingItalic && (
              <MaskedLine delay={0}>
                <span
                  className="text-garnet font-serif italic font-normal text-[clamp(32px,5.6vw,72px)] leading-[1.05] tracking-[-0.005em] [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:font-semibold [dir=rtl]:tracking-normal"
                >
                  {headingItalic}
                </span>
              </MaskedLine>
            )}
            <MaskedLine delay={headingItalic ? 0.18 : 0}>
              <span
                className="text-ink font-display font-normal text-[clamp(40px,7vw,96px)] leading-[0.96] tracking-[-0.024em] [dir=rtl]:font-arabic-display [dir=rtl]:font-medium [dir=rtl]:tracking-normal"
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
              className={`max-w-[58ch] text-pretty text-ink-soft font-display text-[17px] leading-[1.6] [dir=rtl]:font-arabic [dir=rtl]:leading-[1.95] ${align === 'center' ? 'mx-auto' : ''}`}
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
