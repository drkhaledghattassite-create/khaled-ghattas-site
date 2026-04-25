'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'

const EASE_BACK_OUT: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

type LogoCard = {
  label: string
  bg: string
  fg: string
  rest: number
  left: string
  top: string
  width: string
  height: string
  display: 'sans' | 'serif'
}

const CARDS: LogoCard[] = [
  { label: 'AL JAZEERA',   bg: '#F2A900', fg: '#111', rest:  4,  left:  '4%', top: '10%', width: '44%', height: '20%', display: 'sans'  },
  { label: 'BBC ARABIC',   bg: '#000000', fg: '#FFF', rest: -15, left: '46%', top:  '0%', width: '48%', height: '22%', display: 'sans'  },
  { label: 'SKY NEWS AR.', bg: '#1E3A8A', fg: '#FFF', rest:  5,  left:  '2%', top: '36%', width: '54%', height: '18%', display: 'sans'  },
  { label: 'LBC',          bg: '#DC2626', fg: '#FFF', rest:  45, left: '58%', top: '26%', width: '24%', height: '26%', display: 'sans'  },
  { label: 'MTV',          bg: '#0EA5E9', fg: '#FFF', rest: -10, left: '40%', top: '46%', width: '48%', height: '22%', display: 'sans'  },
  { label: 'AL ARABIYA',   bg: '#FFFFFF', fg: '#111', rest:  0,  left: '14%', top: '68%', width: '36%', height: '22%', display: 'serif' },
  { label: 'OTV',          bg: '#F97316', fg: '#FFF', rest:  7,  left: '50%', top: '72%', width: '42%', height: '20%', display: 'sans'  },
]

export function StatsLogos() {
  const locale = useLocale()
  const t = useTranslations('stats')
  const isRtl = locale === 'ar'

  return (
    <section className="relative z-[2] overflow-hidden bg-cream px-[var(--spacing-md)] py-[var(--spacing-xl)]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-[var(--spacing-xl)] lg:grid-cols-[1fr_1.1fr]">
        <motion.div
          className="flex flex-col gap-[var(--spacing-md)]"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <p
            className="text-ink"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
              fontSize: isRtl ? '22px' : '32.4px',
              lineHeight: isRtl ? 1.8 : '38.88px',
            }}
          >
            {t('bio')}
          </p>

          <p
            className="uppercase text-ink"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
              fontStyle: isRtl ? 'normal' : 'italic',
              fontWeight: isRtl ? 600 : 400,
              fontSize: isRtl ? '18px' : '19.8px',
              lineHeight: isRtl ? 1.7 : '25.74px',
              letterSpacing: isRtl ? 'normal' : '0.5px',
            }}
          >
            {t('media')}
          </p>

          <div className="pt-2">
            <Link
              href="/about"
              className="group relative inline-flex items-center gap-2 rounded-full border border-dashed border-ink px-4 py-2 text-[13px] text-ink transition-colors duration-300 hover:bg-ink hover:text-cream-soft"
              style={{ letterSpacing: '0.08em' }}
            >
              <span aria-hidden className="h-[9px] w-[9px] rounded-full bg-ink transition-colors duration-300 group-hover:bg-cream-soft" />
              <span className="font-label">{t('cta')}</span>
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="relative mx-auto h-[480px] w-full max-w-[640px] md:h-[600px]"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
        >
          {CARDS.map((card, i) => (
            <LogoCardMotion key={card.label} card={card} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function LogoCardMotion({ card, index }: { card: LogoCard; index: number }) {
  const { label, bg, fg, rest, left, top, width, height, display } = card
  return (
    <motion.div
      variants={{
        hidden: { y: -420, rotate: 0, opacity: 0 },
        show: {
          y: 0,
          rotate: [0, rest + 2, rest - 2, rest + 1, rest],
          opacity: 1,
          transition: {
            y: { duration: 0.7, delay: 0.2 + index * 0.08, ease: EASE_BACK_OUT },
            rotate: {
              duration: 1.1,
              delay: 0.2 + index * 0.08,
              times: [0, 0.6, 0.75, 0.9, 1],
              ease: 'easeOut',
            },
            opacity: { duration: 0.5, delay: 0.2 + index * 0.08 },
          },
        },
      }}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        transformOrigin: '50% 50%',
        zIndex: 10 + index,
        background: bg,
        color: fg,
        border: '1px dashed rgba(37, 35, 33, 0.7)',
        willChange: 'transform, opacity',
      }}
      className="flex items-center justify-center px-3 py-2"
      aria-label={label}
    >
      <span
        className="select-none tracking-[0.14em]"
        style={{
          fontFamily: display === 'serif' ? 'var(--font-serif)' : 'var(--font-oswald)',
          fontWeight: display === 'serif' ? 400 : 600,
          fontStyle: display === 'serif' ? 'italic' : 'normal',
          fontSize: 'clamp(12px, 2.2vw, 22px)',
          textAlign: 'center',
        }}
      >
        {label}
      </span>
    </motion.div>
  )
}
