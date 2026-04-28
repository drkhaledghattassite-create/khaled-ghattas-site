'use client'

import Image from 'next/image'
import { useLocale } from 'next-intl'
import { motion } from 'motion/react'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

type Props = {
  eyebrow?: string
  headingItalic?: string
  headingSans: string
  description?: string
  image?: { src: string; alt: string }
  align?: 'start' | 'center'
  /** Folio number such as "Nº 01" or "٠١". Optional editorial flourish. */
  folio?: string
}

/**
 * Inner-page hero — Qalem v2 editorial opener.
 * Eyebrow rule + heading + optional dek + optional portrait, with a 1px
 * hairline border below mirroring the homepage section pattern.
 */
export function InnerHero({
  eyebrow,
  headingItalic,
  headingSans,
  description,
  image,
  align = 'start',
  folio,
}: Props) {
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const alignClass = align === 'center' ? 'items-center text-center' : 'items-start text-start'

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      className="relative border-b border-[var(--color-border)] [padding:clamp(80px,9vw,128px)_clamp(20px,5vw,56px)_clamp(64px,7vw,96px)]"
    >
      <div
        className={`relative mx-auto grid max-w-[var(--container-max)] gap-[clamp(40px,6vw,72px)] ${
          image ? 'md:grid-cols-[1.2fr_1fr] md:items-center' : ''
        }`}
      >
        {folio && (
          <span
            aria-hidden
            className={`absolute top-0 [inset-inline-end:0] text-[11px] font-semibold tracking-[0.18em] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${
              isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !font-bold' : 'font-display'
            }`}
          >
            {folio}
          </span>
        )}

        <div className={`flex flex-col gap-7 ${alignClass}`}>
          {eyebrow && (
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05, ease: EASE }}
              className="section-eyebrow"
            >
              {eyebrow}
            </motion.span>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
            className="m-0"
          >
            {headingItalic && (
              <span
                className={`block text-[var(--color-accent)] text-[clamp(22px,3vw,32px)] leading-[1.2] font-medium tracking-[-0.005em] mb-2 ${
                  isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.012em]'
                }`}
              >
                {headingItalic}
              </span>
            )}
            <span
              className={`block text-[var(--color-fg1)] text-[clamp(40px,6vw,72px)] leading-[0.98] font-extrabold tracking-[-0.02em] [text-wrap:balance] ${
                isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.035em]'
              }`}
            >
              {headingSans}
            </span>
          </motion.h1>

          <motion.span
            aria-hidden
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.4, ease: EASE }}
            className="block w-12 h-[3px] bg-[var(--color-accent)]"
            style={{ transformOrigin: isRtl ? 'right' : 'left' }}
          />

          {description && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease: EASE }}
              className={`m-0 max-w-[58ch] text-[clamp(15px,1.4vw,17px)] leading-[1.7] text-[var(--color-fg2)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              } ${align === 'center' ? 'mx-auto' : ''}`}
            >
              {description}
            </motion.p>
          )}
        </div>

        {image && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, ease: EASE, delay: 0.25 }}
            className="relative mx-auto w-full max-w-[520px]"
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-[4px] bg-[var(--color-bg-deep)]">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority
                sizes="(min-width: 768px) 520px, 100vw"
                className="object-cover object-center [filter:saturate(0.82)_contrast(1.04)] dark:[filter:saturate(0.65)_contrast(1.06)_brightness(0.88)]"
              />
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
