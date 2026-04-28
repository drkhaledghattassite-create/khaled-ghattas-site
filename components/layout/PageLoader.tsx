'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Logo } from '@/components/shared/Logo'

const SESSION_KEY = 'kg_intro_seen'
const EASE_IN_OUT_QUART: [number, number, number, number] = [0.77, 0, 0.175, 1]
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

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
  const wipeDuration = reduceMotion ? 0.2 : 1.0
  const wipeDelay = reduceMotion ? 0 : 0.95

  return (
    <div
      id="page-loader"
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden bg-[var(--color-bg)]"
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.96, 1, 1, 0.98] }}
          transition={{ duration: 2.0, times: [0, 0.18, 0.78, 1], ease: 'easeOut' }}
        >
          <Logo height={64} alt={t('intro')} priority />
        </motion.div>

        <motion.span
          aria-hidden
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.2 }}
          className="block h-[2px] w-10 bg-[var(--color-accent)] origin-center"
        />

        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.3 }}
          className={`text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-fg3)] ${
            isRtl ? 'font-arabic-body !text-[12.5px] !tracking-[0.04em] !normal-case !font-bold' : 'font-display'
          }`}
        >
          {isRtl ? 'قَلَم' : 'Qalem'}
        </motion.span>
      </div>

      <motion.div
        className="absolute inset-x-0 top-0 z-10 bg-[var(--color-bg)]"
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
