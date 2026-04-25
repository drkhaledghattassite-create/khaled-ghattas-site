'use client'

import Image from 'next/image'
import { useLocale } from 'next-intl'
import { motion } from 'motion/react'

const EASE_IN_OUT_QUART: [number, number, number, number] = [0.77, 0, 0.175, 1]

type Props = {
  eyebrow?: string
  headingItalic?: string
  headingSans: string
  description?: string
  image?: { src: string; alt: string }
  align?: 'start' | 'center'
}

/**
 * Reusable hero for inner pages. Mask-reveal heading, optional italic
 * serif lead, optional B&W image with dotted-outline frame.
 */
export function InnerHero({
  eyebrow,
  headingItalic,
  headingSans,
  description,
  image,
  align = 'start',
}: Props) {
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const alignClass = align === 'center' ? 'text-center items-center' : 'text-start items-start'

  return (
    <section className="relative z-[2] bg-cream px-[var(--spacing-md)] pt-[calc(var(--spacing-xl)+43px)] pb-[var(--spacing-xl)]">
      <div
        className={`mx-auto grid max-w-[1440px] gap-[var(--spacing-lg)] ${image ? 'md:grid-cols-[1.2fr_1fr]' : ''}`}
      >
        <div className={`flex flex-col gap-[var(--spacing-md)] ${alignClass}`}>
          {eyebrow && (
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
              className="font-label text-ink-muted"
            >
              {eyebrow}
            </motion.span>
          )}
          <header className="space-y-2">
            {headingItalic && (
              <MaskedLine delay={0}>
                <span
                  className="uppercase text-ink"
                  style={{
                    fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
                    fontStyle: isRtl ? 'normal' : 'italic',
                    fontWeight: isRtl ? 700 : 400,
                    fontSize: 'clamp(36px, 9vw, 88.2px)',
                    lineHeight: 1.05,
                  }}
                >
                  {headingItalic}
                </span>
              </MaskedLine>
            )}
            <MaskedLine delay={headingItalic ? 0.15 : 0}>
              <span
                className="uppercase text-ink"
                style={{
                  fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
                  fontWeight: isRtl ? 700 : 600,
                  fontSize: 'clamp(42px, 11vw, 92.88px)',
                  lineHeight: 0.95,
                  letterSpacing: isRtl ? 'normal' : '-3px',
                }}
              >
                {headingSans}
              </span>
            </MaskedLine>
          </header>

          {description && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
              className="max-w-prose text-ink-muted text-[15px] leading-[1.7]"
            >
              {description}
            </motion.p>
          )}
        </div>

        {image && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE_IN_OUT_QUART, delay: 0.5 }}
            className="relative mx-auto aspect-[3/4] w-full max-w-[520px]"
          >
            <div className="dotted-outline absolute inset-0 overflow-hidden bg-cream-warm">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority
                sizes="(min-width: 768px) 520px, 100vw"
                className="object-cover object-center grayscale"
              />
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
        initial={{ y: '100%', opacity: 0 }}
        whileInView={{ y: '0%', opacity: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.8, delay, ease: EASE_IN_OUT_QUART }}
      >
        {children}
      </motion.span>
    </span>
  )
}
