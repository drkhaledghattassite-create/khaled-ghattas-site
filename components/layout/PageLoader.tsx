'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Logo } from '@/components/shared/Logo'
import { Ornament } from '@/components/shared/Ornament'

const SESSION_KEY = 'kg_intro_seen'
const EASE_IN_OUT_QUART: [number, number, number, number] = [0.77, 0, 0.175, 1]
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

/**
 * Mawqid intro curtain.
 *
 * A quiet, parchment-warm reveal: the brand mark rises behind a fleuron
 * pulse, then the curtain wipes upward over 1100ms. No marquee chaos.
 * Reduced-motion users get the curtain hidden after 200ms.
 */
export function PageLoader() {
  const locale = useLocale()
  const t = useTranslations('loading')
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      setVisible(false)
      return
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
  }, [])

  if (!mounted || !visible) return null

  const isRtl = locale === 'ar'
  const wipeDuration = reduceMotion ? 0.2 : 1.1
  const wipeDelay = reduceMotion ? 0 : 1.0

  return (
    <div
      id="page-loader"
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden bg-paper"
    >
      {/* Subtle radial wash so the centre feels lit */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(45% 35% at 50% 45%, rgba(168, 196, 214, 0.14) 0%, transparent 70%)',
        }}
      />

      {/* Brand mark, brass fleuron above and below */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          className="text-brass"
        >
          <Ornament glyph="fleuron" size={28} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.94, 1, 1, 0.97] }}
          transition={{ duration: 2.2, times: [0, 0.18, 0.78, 1], ease: 'easeOut' }}
          aria-hidden
        >
          <Logo height={72} alt={t('intro')} priority />
        </motion.div>

        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.2 }}
          className="text-[11px] tracking-[0.32em] text-ink-muted uppercase"
          style={{
            fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
            fontStyle: isRtl ? 'normal' : 'italic',
            letterSpacing: isRtl ? 0 : '0.32em',
            textTransform: isRtl ? 'none' : 'uppercase',
            fontWeight: 500,
            fontSize: isRtl ? 13 : 11,
          }}
        >
          {isRtl ? 'موقد' : 'Mawqid'}
        </motion.span>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.35 }}
          className="text-brass"
        >
          <Ornament glyph="fleuron" size={20} />
        </motion.div>
      </div>

      {/* Upward curtain wipe */}
      <motion.div
        className="absolute inset-x-0 top-0 z-10 bg-paper"
        style={{ willChange: 'height' }}
        initial={{ height: '100%' }}
        animate={{ height: '0%' }}
        transition={{ duration: wipeDuration, delay: wipeDelay, ease: EASE_IN_OUT_QUART }}
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
