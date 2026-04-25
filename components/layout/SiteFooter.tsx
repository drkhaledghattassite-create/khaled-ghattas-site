'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'

const EASE_IN_OUT_QUART: [number, number, number, number] = [
  0.77, 0, 0.175, 1,
]

export function SiteFooter() {
  const locale = useLocale()
  const t = useTranslations('footer')
  const isRtl = locale === 'ar'

  return (
    <footer className="relative overflow-hidden bg-cream">
      <div className="container relative z-10 flex flex-col gap-[var(--spacing-lg)] pt-[var(--spacing-xl)] pb-[var(--spacing-lg)] md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-[var(--spacing-md)] md:max-w-[60%]">
          <motion.h2
            initial={{ y: '100%', opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.7, ease: EASE_IN_OUT_QUART }}
            className="text-ink text-[clamp(48px,8vw,120px)] leading-[0.95] tracking-[-0.02em] uppercase"
            style={{
              fontFamily: isRtl
                ? 'var(--font-arabic)'
                : 'var(--font-oswald)',
              fontWeight: 600,
            }}
          >
            {t('end_of_page')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{
              duration: 0.6,
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.15,
            }}
            className="max-w-prose text-ink-muted text-[15px] leading-[1.6]"
          >
            {t('description')}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: 0.3,
          }}
          className="flex flex-col items-start gap-3"
        >
          <span className="font-label text-ink-muted text-[12px]">
            {t('go_to_next_page')}
          </span>
          <Link
            href="/about"
            className="group inline-flex items-center gap-3"
          >
            <span aria-hidden className="block h-3 w-3 rounded-full bg-ink transition-transform duration-300 group-hover:scale-110" />
            <span
              className="text-ink text-[28px] italic leading-none transition-colors duration-200 group-hover:text-amber"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {t('next_page_label')}
            </span>
          </Link>
        </motion.div>
      </div>

      <motion.div
        initial={{ y: '100%' }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, margin: '-20%' }}
        transition={{ duration: 0.9, ease: EASE_IN_OUT_QUART }}
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1 bg-ink"
      />

      <div className="container flex items-center justify-between border-t border-ink/15 py-4 text-ink-muted">
        <span className="font-label text-[11px]">© {new Date().getFullYear()} {t('brand')}</span>
        <span className="font-label text-[11px]">{t('copyright')}</span>
      </div>
    </footer>
  )
}
