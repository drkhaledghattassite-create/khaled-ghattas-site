'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { Logo, LogoLink } from '@/components/shared/Logo'
import { Ornament, FlourishRule } from '@/components/shared/Ornament'

const EASE_IN_OUT_QUART: [number, number, number, number] = [0.77, 0, 0.175, 1]

export function SiteFooter() {
  const locale = useLocale()
  const t = useTranslations('footer')
  const isRtl = locale === 'ar'

  return (
    <footer className="relative overflow-hidden bg-paper">
      {/* Warm mauve vignette in the lower corner — the hearth glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 60% at 12% 110%, rgba(90, 74, 85, 0.12) 0%, transparent 65%)',
        }}
      />

      <div className="container relative z-10 grid gap-[var(--spacing-lg)] pt-[var(--spacing-2xl)] pb-[var(--spacing-lg)] md:grid-cols-[1.5fr_1fr] md:gap-[var(--spacing-xl)]">
        <div className="flex flex-col gap-[var(--spacing-md)]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex items-baseline gap-3 text-ink-muted"
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
              .10 — {isRtl ? 'الخاتمة' : 'Colophon'}
            </span>
          </motion.div>

          <motion.h2
            initial={{ y: '100%', opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.85, ease: EASE_IN_OUT_QUART }}
            className="text-balance text-ink"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic-display)' : 'var(--font-display)',
              fontWeight: isRtl ? 500 : 400,
              fontSize: 'clamp(48px,8.5vw,124px)',
              lineHeight: 0.92,
              letterSpacing: isRtl ? 0 : '-0.025em',
            }}
          >
            {t('end_of_page')}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
            className="max-w-[60ch] text-pretty text-ink-soft"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
              fontSize: 16,
              lineHeight: isRtl ? 1.95 : 1.65,
            }}
          >
            {t('description')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-2 flex items-center gap-3 text-ink-muted"
          >
            <LogoLink href="/" alt={t('brand')} height={42} />
          </motion.div>
        </div>

        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.25 }}
          className="flex flex-col items-start gap-4 md:items-end md:text-end"
        >
          <span
            className="text-[10px] tracking-[0.22em] text-ink-muted uppercase"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
              letterSpacing: isRtl ? 0 : '0.22em',
              textTransform: isRtl ? 'none' : 'uppercase',
              fontWeight: 500,
              fontSize: isRtl ? 12 : 10,
            }}
          >
            {t('go_to_next_page')}
          </span>
          <Link href="/about" className="group inline-flex items-baseline gap-3">
            <span
              className="text-ink transition-colors duration-300 group-hover:text-brass"
              style={{
                fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
                fontStyle: isRtl ? 'normal' : 'italic',
                fontSize: 'clamp(36px, 5vw, 56px)',
                lineHeight: 1,
                fontWeight: isRtl ? 600 : 400,
                letterSpacing: isRtl ? 0 : '-0.01em',
              }}
            >
              {t('next_page_label')}
            </span>
            <span aria-hidden className="text-brass">
              <Ornament glyph="arabesque" size={22} />
            </span>
          </Link>
        </motion.aside>
      </div>

      <div className="container relative z-10">
        <FlourishRule className="my-6" />
      </div>

      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: '-20%' }}
        transition={{ duration: 1.1, ease: EASE_IN_OUT_QUART }}
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[3px] origin-[inline-start] bg-gradient-to-r from-brass via-garnet to-brass"
      />

      <div className="container relative z-10 flex items-center justify-between gap-3 py-5 text-ink-muted">
        <div className="flex items-center gap-3">
          <Logo height={20} alt={t('brand')} />
          <span
            className="tabular-nums text-[11px] tracking-[0.06em]"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
              fontStyle: isRtl ? 'normal' : 'italic',
              fontSize: isRtl ? 13 : 11,
            }}
          >
            © {new Date().getFullYear()} · {t('brand')}
          </span>
        </div>
        <span
          className="text-[11px] tracking-[0.18em] uppercase"
          style={{
            fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
            letterSpacing: isRtl ? 0 : '0.16em',
            textTransform: isRtl ? 'none' : 'uppercase',
            fontWeight: 500,
            fontSize: isRtl ? 12 : 10,
          }}
        >
          {t('copyright')}
        </span>
      </div>
    </footer>
  )
}
