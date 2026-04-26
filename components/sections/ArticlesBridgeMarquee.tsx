'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion, useReducedMotion } from 'motion/react'
import { Ornament } from '@/components/shared/Ornament'

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

const CLIPPINGS = [
  { src: '/placeholder/nav/nav-1.jpg', rotate: -4 },
  { src: '/placeholder/nav/nav-2.jpg', rotate: 3 },
  { src: '/placeholder/nav/nav-3.jpg', rotate: -2 },
  { src: '/placeholder/nav/nav-4.jpg', rotate: 5 },
  { src: '/placeholder/nav/nav-5.jpg', rotate: -6 },
  { src: '/placeholder/nav/nav-1.jpg', rotate: 4 },
]

/**
 * Bridge between Articles and Interviews — a single warm garnet plate
 * with a slow ghost row and a press clipping pin board. Calmer than the
 * original two-row marquee chaos.
 */
export function ArticlesBridgeMarquee() {
  const t = useTranslations('articles.bridge')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  return (
    <section
      className="relative z-[2] overflow-hidden py-[var(--spacing-xl)]"
      style={{
        background:
          'linear-gradient(180deg, var(--color-paper) 0%, var(--color-brand-black) 18%, var(--color-brand-black) 82%, var(--color-paper) 100%)',
      }}
    >
      <GiantRow text={t('row_1')} direction="left" tone="ghost" />
      <div className="my-8 flex justify-center text-brass">
        <Ornament glyph="fleuron" size={26} />
      </div>
      <GiantRow text={t('row_2')} direction="right" tone="bright" />

      <div className="mt-12 flex flex-wrap items-end justify-center gap-5 px-[var(--section-pad-x)] md:gap-9">
        {CLIPPINGS.map((c, i) => (
          <motion.div
            key={i}
            className="frame-print relative h-32 w-24 bg-paper-soft md:h-40 md:w-28"
            style={{ willChange: 'transform, opacity' }}
            initial={{ y: '120%', opacity: 0, rotate: c.rotate }}
            whileInView={{ y: 0, opacity: 1, rotate: c.rotate }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.85, delay: i * 0.08, ease: EASE_OUT_EXPO }}
          >
            <div className="relative h-full w-full overflow-hidden">
              <Image src={c.src} alt="" fill sizes="112px" className="object-cover duotone-warm" />
            </div>
            {/* "Pin" — small brass dot up top */}
            <span
              aria-hidden
              className="absolute -top-1.5 left-1/2 block h-2 w-2 -translate-x-1/2 rounded-full bg-brass shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
            />
          </motion.div>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <span
          className="font-display italic font-medium text-[11px] tracking-[0.22em] uppercase text-paper-soft/55 [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:text-[12px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
        >
          {isRtl ? 'مختارات من المطبوعات' : 'Press clippings & cuttings'}
        </span>
      </div>
    </section>
  )
}

function GiantRow({
  text,
  direction,
  tone,
}: {
  text: string
  direction: 'left' | 'right'
  tone: 'ghost' | 'bright'
}) {
  const reduce = useReducedMotion() ?? false
  const copies = new Array(8).fill(text)
  const color = tone === 'ghost' ? 'rgba(240, 230, 216, 0.14)' : 'rgba(240, 230, 216, 0.95)'
  const fromX = direction === 'left' ? '0%' : '-50%'
  const toX = direction === 'left' ? '-50%' : '0%'
  const accent = tone === 'ghost' ? 'rgba(168, 196, 214, 0.7)' : 'rgba(168, 196, 214, 1)'

  return (
    <div className="relative w-full overflow-hidden">
      <motion.div
        className="flex items-center whitespace-nowrap"
        initial={{ x: fromX }}
        animate={reduce ? { x: '-25%' } : { x: toX }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 42, ease: 'linear', repeat: Infinity, repeatType: 'loop' }
        }
        style={{ willChange: reduce ? undefined : 'transform' }}
      >
        {[...copies, ...copies].map((line, i) => (
          <span key={i} className="flex items-center pe-md md:pe-lg">
            <span
              className="font-serif italic font-normal text-[clamp(48px,11vw,142px)] leading-[0.98] tracking-[-0.015em] [dir=rtl]:font-arabic-display [dir=rtl]:not-italic [dir=rtl]:font-medium [dir=rtl]:tracking-normal"
              style={{ color }}
            >
              {line}
            </span>
            <span aria-hidden className="mx-6" style={{ color: accent }}>
              <Ornament glyph="fleuron" size={28} />
            </span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}
