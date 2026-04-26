'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { Ornament } from '@/components/shared/Ornament'

/**
 * Quieter bridge — single brass-painted plate beneath two slow rows.
 * The CTA pill below sits on warm parchment so it reads as a journal
 * footer, not a marquee.
 */
export function BooksBridgeMarquee() {
  const t = useTranslations('books.bridge')
  const tCta = useTranslations('cta')

  return (
    <section className="relative z-[2] overflow-hidden bg-paper-warm py-[var(--spacing-xl)]">
      <GiantRow text={t('row_1')} direction="left" tone="ghost" />
      <div className="my-6 flex justify-center text-brass">
        <Ornament glyph="fleuron" size={22} />
      </div>
      <GiantRow text={t('row_2')} direction="right" tone="dark" />

      <div className="mt-10 flex justify-center">
        <Link href="/books" className="inline-flex items-center gap-2 px-5 py-[10px] min-h-[42px] rounded-full border border-ink bg-ink text-paper-soft text-[13px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] hover:bg-brass-deep hover:border-brass-deep active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold [dir=rtl]:text-[13.5px]">
          <span aria-hidden className="block h-[7px] w-[7px] rounded-full bg-current" />
          <span>{tCta('all_books')}</span>
        </Link>
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
  tone: 'ghost' | 'dark'
}) {
  const locale = useLocale()
  const reduce = useReducedMotion() ?? false
  const isRtl = locale === 'ar'
  const copies = new Array(8).fill(text)
  const color = tone === 'ghost' ? 'rgba(42, 37, 40, 0.18)' : 'var(--color-ink)'
  const accent = tone === 'ghost' ? 'rgba(168, 196, 214, 0.55)' : 'var(--color-brass)'
  const fromX = direction === 'left' ? '0%' : '-50%'
  const toX = direction === 'left' ? '-50%' : '0%'

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
              style={{
                fontFamily: isRtl ? 'var(--font-arabic-display)' : 'var(--font-serif)',
                fontStyle: isRtl ? 'normal' : 'italic',
                fontWeight: isRtl ? 500 : 400,
                fontSize: 'clamp(44px, 10vw, 132px)',
                lineHeight: 1.0,
                color,
                letterSpacing: isRtl ? 0 : '-0.012em',
              }}
            >
              {line}
            </span>
            <span aria-hidden className="mx-5" style={{ color: accent }}>
              <Ornament glyph="fleuron" size={24} />
            </span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}
