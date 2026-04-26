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
              className="font-display italic font-medium text-[11px] tracking-[0.18em] uppercase [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:text-[13px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
            >
              .10 — {isRtl ? 'الخاتمة' : 'Colophon'}
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <LogoLink href="/" alt={t('brand')} height={32} />
          </motion.div>

          <motion.h2
            initial={{ y: '100%', opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.85, ease: EASE_IN_OUT_QUART }}
            className="text-balance text-ink font-display font-semibold text-[clamp(32px,5vw,48px)] leading-[1.05] tracking-[-0.025em] [dir=rtl]:font-arabic-display [dir=rtl]:font-medium [dir=rtl]:tracking-normal"
          >
            {t('end_of_page')}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
            className="max-w-[60ch] text-pretty text-ink-soft font-display text-[16px] leading-[1.65] [dir=rtl]:font-arabic [dir=rtl]:leading-[1.95]"
          >
            {t('description')}
          </motion.p>
        </div>

        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.25 }}
          className="flex flex-col items-start gap-4 md:items-end md:text-end"
        >
          <span
            className="font-display font-medium text-[10px] tracking-[0.22em] text-ink-muted uppercase [dir=rtl]:font-arabic [dir=rtl]:text-[12px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
          >
            {t('go_to_next_page')}
          </span>
          <Link href="/about" className="group inline-flex items-baseline gap-3">
            <span
              className="text-ink transition-colors duration-300 group-hover:text-brass font-serif italic font-normal text-[clamp(36px,5vw,56px)] leading-none tracking-[-0.01em] [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:font-semibold [dir=rtl]:tracking-normal"
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

      <div className="container relative z-10 flex items-center justify-between gap-3 py-5 text-ink-muted">
        <div className="flex items-center gap-3">
          <Logo height={20} alt={t('brand')} />
          <span
            className="tabular-nums font-display italic text-[11px] tracking-[0.06em] [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:text-[13px]"
          >
            © {new Date().getFullYear()} · {t('brand')}
          </span>
        </div>
        <span
          className="font-display font-medium text-[10px] tracking-[0.16em] uppercase [dir=rtl]:font-arabic [dir=rtl]:text-[12px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
        >
          {t('copyright')}
        </span>
      </div>
    </footer>
  )
}
