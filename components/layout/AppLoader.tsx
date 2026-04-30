'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'motion/react'
import { Logo } from '@/components/shared/Logo'

const SESSION_KEY = 'kg_intro_seen'
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]
const EASE_IN_OUT_QUART: [number, number, number, number] = [0.77, 0, 0.175, 1]

const FIRST_DURATION_MS = 2000
const NAV_DURATION_MS = 700

type Mode = 'first' | 'nav' | null

/**
 * Unified app-wide loader.
 *  - First load (sessionStorage gate): black-bg sequenced splash with logo + wordmark.
 *  - Subsequent navigations: brief logo overlay with blur backdrop, theme-aware.
 *
 * Replaces both PageLoader (home-only) and RouteLoader (top progress bar).
 */
export function AppLoader() {
  const locale = useLocale()
  const t = useTranslations('loading')
  const pathname = usePathname()
  const isRtl = locale === 'ar'

  const [mode, setMode] = useState<Mode>(null)
  const [reduceMotion, setReduceMotion] = useState(false)
  const prevPath = useRef<string | null>(null)
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstDoneRef = useRef(false)

  // Mount: detect first-load vs already-seen, then settle
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onMq = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', onMq)

    const seen = sessionStorage.getItem(SESSION_KEY) === '1'
    if (seen) {
      firstDoneRef.current = true
      prevPath.current = pathname
    } else {
      setMode('first')
      const dur = mq.matches ? 250 : FIRST_DURATION_MS
      firstTimerRef.current = setTimeout(() => {
        try {
          sessionStorage.setItem(SESSION_KEY, '1')
        } catch {}
        firstDoneRef.current = true
        setMode(null)
        prevPath.current = pathname
      }, dur)
    }

    return () => {
      mq.removeEventListener('change', onMq)
      if (firstTimerRef.current) clearTimeout(firstTimerRef.current)
      if (navTimerRef.current) clearTimeout(navTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Subsequent path changes → brief nav overlay
  useEffect(() => {
    if (!firstDoneRef.current) return
    if (prevPath.current === null) {
      prevPath.current = pathname
      return
    }
    if (prevPath.current === pathname) return
    prevPath.current = pathname

    if (navTimerRef.current) clearTimeout(navTimerRef.current)
    setMode('nav')
    const dur = reduceMotion ? 200 : NAV_DURATION_MS
    navTimerRef.current = setTimeout(() => setMode(null), dur)
  }, [pathname, reduceMotion])

  // Imperative trigger — for actions that don't change pathname (e.g. external
  // redirects via window.location.href to Stripe). Dispatch the event with an
  // optional `detail.duration` (ms) to override the default nav duration.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onShow = (e: Event) => {
      if (!firstDoneRef.current) return
      const detail = (e as CustomEvent<{ duration?: number }>).detail
      const override = detail?.duration
      if (navTimerRef.current) clearTimeout(navTimerRef.current)
      setMode('nav')
      const dur = override ?? (reduceMotion ? 200 : NAV_DURATION_MS)
      navTimerRef.current = setTimeout(() => setMode(null), dur)
    }
    window.addEventListener('kg:loader:show', onShow)
    return () => window.removeEventListener('kg:loader:show', onShow)
  }, [reduceMotion])

  return (
    <AnimatePresence mode="wait">
      {mode === 'first' && (
        <FirstLoadSplash isRtl={isRtl} label={t('intro')} reduceMotion={reduceMotion} />
      )}
      {mode === 'nav' && (
        <NavOverlay label={t('intro')} reduceMotion={reduceMotion} />
      )}
    </AnimatePresence>
  )
}

function FirstLoadSplash({
  isRtl,
  label,
  reduceMotion,
}: {
  isRtl: boolean
  label: string
  reduceMotion: boolean
}) {
  const wipeDuration = reduceMotion ? 0.2 : 1.0
  const wipeDelay = reduceMotion ? 0 : 0.95

  return (
    <motion.div
      key="first-load"
      role="status"
      aria-live="polite"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden bg-[#000]"
    >
      <span className="sr-only">{label}</span>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.96, 1, 1, 0.98] }}
          transition={{ duration: 2.0, times: [0, 0.18, 0.78, 1], ease: 'easeOut' }}
          className="invert"
        >
          <Logo height={64} alt="" priority />
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
          className={`text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60 ${
            isRtl ? 'font-arabic-body !text-[12.5px] !tracking-[0.04em] !normal-case !font-bold' : 'font-display'
          }`}
        >
          {isRtl ? 'قَلَم' : 'Qalem'}
        </motion.span>
      </div>

      {/* Wipe-up reveal — clears the splash */}
      <motion.div
        className="absolute inset-x-0 top-0 z-10 bg-[#000]"
        style={{ willChange: 'height' }}
        initial={{ height: '100%' }}
        animate={{ height: '0%' }}
        transition={{ duration: wipeDuration, delay: wipeDelay, ease: EASE_IN_OUT_QUART }}
      />
    </motion.div>
  )
}

function NavOverlay({
  label,
  reduceMotion,
}: {
  label: string
  reduceMotion: boolean
}) {
  const enter = reduceMotion ? 0.12 : 0.22
  const exit = reduceMotion ? 0.12 : 0.36

  return (
    <motion.div
      key="nav-overlay"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: enter, ease: EASE_OUT_EXPO }}
      className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--color-bg)]/[0.32] backdrop-blur-xl backdrop-saturate-[1.15] supports-[backdrop-filter]:bg-[var(--color-bg)]/[0.22]"
    >
      <span className="sr-only">{label}</span>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: [0, 1, 1, 0.7], scale: [0.94, 1, 1, 0.98] }}
        exit={{ opacity: 0, scale: 0.96, transition: { duration: exit, ease: EASE_OUT_EXPO } }}
        transition={{ duration: 0.55, ease: EASE_OUT_EXPO, times: [0, 0.3, 0.75, 1] }}
        className="flex flex-col items-center gap-3"
      >
        <Logo height={44} alt="" />
        <motion.span
          aria-hidden
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.05 }}
          className="block h-[2px] w-7 bg-[var(--color-accent)] origin-center"
        />
      </motion.div>
    </motion.div>
  )
}
