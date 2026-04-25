'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { ChapterMark, Ornament } from '@/components/shared/Ornament'

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]
const EASE_BACK_OUT: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

type MediaCard = {
  label: string
  bg: string
  fg: string
  rest: number
  display: 'sans' | 'serif'
}

// Calmer constellation. The wild Webflow scatter became too generic — replace
// with a tidy vertical stack of pressed labels, like clippings on a contact
// sheet. Each card carries a subtle tilt for life, but never overlaps.
// Real brand colors are preserved (recognizable identity markers); the only
// "neutral" card (AL ARABIYA, originally white) borrows mauve-soft from the
// new portrait palette so it harmonizes instead of looking like missing art.
const CARDS: MediaCard[] = [
  { label: 'AL JAZEERA',   bg: '#F2A900', fg: '#1F1812', rest: -2, display: 'serif' },
  { label: 'BBC ARABIC',   bg: '#1F1812', fg: '#F0E6D8', rest:  3, display: 'sans'  },
  { label: 'SKY NEWS AR.', bg: '#1E3A5C', fg: '#F0E6D8', rest: -3, display: 'sans'  },
  { label: 'LBC',          bg: '#7A2E2A', fg: '#F0E6D8', rest:  2, display: 'serif' },
  { label: 'MTV',          bg: '#3A6B7A', fg: '#F0E6D8', rest: -2, display: 'sans'  },
  { label: 'AL ARABIYA',   bg: '#7B6E78', fg: '#F0E6D8', rest:  3, display: 'serif' },
  { label: 'OTV',          bg: '#B47B3A', fg: '#1F1812', rest: -2, display: 'sans'  },
]

export function StatsLogos() {
  const locale = useLocale()
  const t = useTranslations('stats')
  const isRtl = locale === 'ar'

  return (
    <section className="relative z-[2] overflow-hidden bg-paper px-[var(--section-pad-x)] py-[var(--section-pad-y)]">
      {/* Soft tinted block under the contact sheet — sky tone from the new palette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          background:
            'radial-gradient(60% 50% at 70% 50%, rgba(168, 196, 214, 0.09) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto grid max-w-[1280px] grid-cols-1 items-start gap-[var(--spacing-lg)] lg:grid-cols-[1fr_1fr] lg:gap-[var(--spacing-xl)]">
        <motion.div
          className="flex flex-col gap-[var(--spacing-md)]"
          initial={{ y: 22, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.85, ease: EASE_OUT_QUART }}
        >
          <ChapterMark number=".02" label={isRtl ? 'الصوت والمنبر' : 'A Voice in Print'} />

          <p
            className="text-pretty text-ink"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
              fontSize: isRtl ? 22 : 26,
              lineHeight: isRtl ? 1.95 : 1.5,
              fontWeight: 400,
              fontStyle: isRtl ? 'normal' : 'normal',
            }}
          >
            <span
              className="text-brass me-2 align-baseline"
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: '1.15em',
              }}
            >
              {isRtl ? '«' : '"'}
            </span>
            {t('bio')}
            <span
              className="text-brass ms-1 align-baseline"
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: '1.15em',
              }}
            >
              {isRtl ? '»' : '"'}
            </span>
          </p>

          <div className="rule-ornament my-2" />

          <p
            className="text-ink-soft"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
              fontStyle: isRtl ? 'normal' : 'italic',
              fontWeight: isRtl ? 500 : 400,
              fontSize: isRtl ? 16 : 18,
              lineHeight: isRtl ? 1.85 : 1.55,
            }}
          >
            {t('media')}
          </p>

          <div className="pt-2">
            <Link href="/about" className="pill pill-solid">
              <span aria-hidden className="block h-[7px] w-[7px] rounded-full bg-current" />
              <span>{t('cta')}</span>
            </Link>
          </div>
        </motion.div>

        {/* Contact sheet of media labels — quiet 3-column press grid with hand-pinned rotation */}
        <motion.div
          className="relative mx-auto w-full max-w-[560px]"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
            {CARDS.map((card, i) => (
              <PressCard key={card.label} card={card} index={i} />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-3 text-ink-muted/55">
            <span aria-hidden className="block h-px flex-1 bg-current" />
            <Ornament glyph="asterism" size={12} className="text-brass" />
            <span aria-hidden className="block h-px flex-1 bg-current" />
          </div>
          <p
            className="mt-3 text-center text-[11px] tracking-[0.18em] text-ink-muted uppercase"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
              fontStyle: isRtl ? 'normal' : 'italic',
              letterSpacing: isRtl ? 0 : '0.18em',
              textTransform: isRtl ? 'none' : 'uppercase',
              fontWeight: 500,
              fontSize: isRtl ? 12 : 11,
            }}
          >
            {isRtl ? 'منشور في:' : 'As featured in'}
          </p>
        </motion.div>
      </div>
    </section>
  )
}

function PressCard({ card, index }: { card: MediaCard; index: number }) {
  const { label, bg, fg, rest, display } = card
  return (
    <motion.div
      variants={{
        hidden: { y: 24, opacity: 0, rotate: 0 },
        show: {
          y: 0,
          opacity: 1,
          rotate: rest,
          transition: { duration: 0.6, delay: 0.12 + index * 0.07, ease: EASE_BACK_OUT },
        },
      }}
      whileHover={{ rotate: 0, y: -4 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{
        background: bg,
        color: fg,
        boxShadow:
          '0 1px 0 0 rgba(42, 37, 40, 0.04), 0 10px 24px -22px rgba(42, 37, 40, 0.22)',
        willChange: 'transform, opacity',
      }}
      className="flex h-[72px] items-center justify-center px-5"
    >
      <span
        className="select-none tracking-[0.16em]"
        style={{
          fontFamily: display === 'serif' ? 'var(--font-serif)' : 'var(--font-display)',
          fontWeight: display === 'serif' ? 400 : 500,
          fontStyle: display === 'serif' ? 'italic' : 'normal',
          fontSize: 'clamp(11px, 1.6vw, 14px)',
          textAlign: 'center',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </motion.div>
  )
}
