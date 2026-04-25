'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

const CLIPPINGS = [
  { src: '/placeholder/nav/nav-1.jpg', rotate: -6 },
  { src: '/placeholder/nav/nav-2.jpg', rotate: 4 },
  { src: '/placeholder/nav/nav-3.jpg', rotate: -3 },
  { src: '/placeholder/nav/nav-4.jpg', rotate: 7 },
  { src: '/placeholder/nav/nav-5.jpg', rotate: -8 },
  { src: '/placeholder/nav/nav-1.jpg', rotate: 5 },
]

export function ArticlesBridgeMarquee() {
  const t = useTranslations('articles.bridge')

  return (
    <section className="relative z-[2] overflow-hidden bg-cream py-12">
      <GiantRow text={t('row_1')} direction="left" tone="ghost" />
      <GiantRow text={t('row_2')} direction="right" tone="dark" />

      <div className="mt-10 flex flex-wrap items-center justify-center gap-10 px-[var(--spacing-md)]">
        {CLIPPINGS.map((c, i) => (
          <motion.div
            key={i}
            className="relative h-40 w-28 overflow-hidden border border-dashed border-ink bg-cream-soft"
            style={{ willChange: 'transform, opacity' }}
            initial={{ y: '120%', opacity: 0, rotate: c.rotate }}
            whileInView={{ y: 0, opacity: 1, rotate: c.rotate }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: i * 0.08, ease: EASE_OUT_EXPO }}
          >
            <Image src={c.src} alt="" fill sizes="112px" className="object-cover" />
          </motion.div>
        ))}
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
