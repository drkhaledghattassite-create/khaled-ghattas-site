'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'

export function BooksBridgeMarquee() {
  const t = useTranslations('books.bridge')
  const tCta = useTranslations('cta')

  return (
    <section className="relative z-[2] overflow-hidden bg-cream py-12">
      <GiantRow text={t('row_1')} direction="left" tone="ghost" />
      <GiantRow text={t('row_2')} direction="right" tone="dark" />

      <div className="mt-6 flex justify-center">
        <Link
          href="/books"
          className="group relative inline-flex items-center gap-2 rounded-full border border-dashed border-ink bg-cream px-5 py-2.5 text-[13px] text-ink transition-colors duration-300 hover:bg-ink hover:text-cream-soft"
          style={{ letterSpacing: '0.08em' }}
        >
          <span aria-hidden className="h-[9px] w-[9px] rounded-full bg-ink transition-colors duration-300 group-hover:bg-cream-soft" />
          <span className="font-label">{tCta('all_books')}</span>
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
  const isRtl = locale === 'ar'
  const copies = new Array(6).fill(text)
  const color = tone === 'ghost' ? '#C9C3B7' : '#252321'
  const x = direction === 'left' ? '-50%' : '50%'

  return (
    <div className="relative w-full overflow-hidden">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x }}
        transition={{ duration: 22, ease: 'linear', repeat: Infinity, repeatType: 'loop' }}
        style={{ willChange: 'transform' }}
      >
        {[...copies, ...copies].map((line, i) => (
          <span
            key={i}
            className="pe-xl uppercase"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
              fontStyle: isRtl ? 'normal' : 'italic',
              fontWeight: isRtl ? 700 : 400,
              fontSize: 'clamp(80px, 22vw, 240px)',
              lineHeight: 1,
              color,
            }}
          >
            {line}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
