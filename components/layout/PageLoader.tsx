'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Logo } from '@/components/shared/Logo'

const SESSION_KEY = 'kg_intro_seen'
const EASE_IN_OUT_QUART: [number, number, number, number] = [0.77, 0, 0.175, 1]

/**
 * Page-load curtain. Shows once per tab session.
 *
 * Two-row marquee band rotated -8.52deg behind a cream curtain that
 * wipes upward (height 100%→0%) over 1200ms after a 1200ms delay.
 * Text is locale-aware: Noto Naskh bold for AR, Instrument Serif italic
 * uppercase for EN. Row 1 drifts left, row 2 drifts right, bobbing dot
 * between the rows.
 *
 * Reference: FULL_AUDIT.md §1 (Page load sequence), BEHAVIORS.md §1.2.
 */
export function PageLoader() {
  const locale = useLocale()
  const t = useTranslations('loading')
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1') {
      setVisible(false)
    }
  }, [])

  if (!mounted || !visible) return null

  const isRtl = locale === 'ar'

  return (
    <div
      id="page-loader"
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden bg-cream"
    >
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3"
        style={{ transform: 'rotateZ(-8.52deg) scale(1.25)', transformOrigin: 'center' }}
      >
        <IntroMarqueeTrack direction="left" text={t('marquee_row_1')} isRtl={isRtl} />
        <BobbingDot />
        <IntroMarqueeTrack direction="right" text={t('marquee_row_2')} isRtl={isRtl} />
      </div>

      <motion.div
        className="absolute inset-0 z-[5] flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.92, 1, 1, 0.96] }}
        transition={{ duration: 2.4, times: [0, 0.18, 0.7, 1], ease: 'easeOut' }}
        aria-hidden
      >
        <Logo height={80} alt={t('intro')} priority />
      </motion.div>

      <motion.div
        className="absolute inset-x-0 top-0 z-10 bg-cream"
        style={{ willChange: 'height' }}
        initial={{ height: '100%' }}
        animate={{ height: '0%' }}
        transition={{ duration: 1.2, delay: 1.2, ease: EASE_IN_OUT_QUART }}
        onAnimationComplete={() => {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(SESSION_KEY, '1')
          }
          setVisible(false)
        }}
      />
    </div>
  )
}

function BobbingDot() {
  return (
    <motion.span
      aria-hidden
      className="block h-[10px] w-[10px] rounded-full bg-ink"
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity }}
    />
  )
}

function IntroMarqueeTrack({
  direction,
  text,
  isRtl,
}: {
  direction: 'left' | 'right'
  text: string
  isRtl: boolean
}) {
  const tracks = new Array(6).fill(text)
  const from = direction === 'left' ? '0%' : '-50%'
  const to = direction === 'left' ? '-50%' : '0%'

  return (
    <div className="relative w-[200vw] overflow-hidden">
      <motion.div
        className="flex whitespace-nowrap"
        style={{ willChange: 'transform' }}
        initial={{ x: from }}
        animate={{ x: to }}
        transition={{ duration: 22, ease: 'linear', repeat: Infinity, repeatType: 'loop' }}
      >
        {[...tracks, ...tracks].map((w, i) => (
          <span
            key={i}
            className="pe-xl uppercase"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
              fontStyle: isRtl ? 'normal' : 'italic',
              fontWeight: isRtl ? 700 : 400,
              fontSize: '30.96px',
              lineHeight: 1,
              color: '#252321',
            }}
          >
            {w}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
