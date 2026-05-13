'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'motion/react'
import { Logo } from '@/components/shared/Logo'

const SESSION_KEY = 'kg_intro_seen'
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]
const EASE_IN_OUT_QUART: [number, number, number, number] = [0.77, 0, 0.175, 1]

const FIRST_DURATION_MS = 1500
const NAV_DURATION_MS = 700
/** Minimum time the nav loader stays on screen so it never flashes.
 *  Tuned for the logo to be clearly readable, not just a glimpse. */
const NAV_MIN_DISPLAY_MS = 480

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
  /** Timestamp (performance.now()) of the most recent nav-trigger.
   *  0 means: loader is not currently armed by an explicit click. */
  const navStartRef = useRef<number>(0)

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

  // Proactive trigger — fire the loader immediately on any internal anchor
  // click, BEFORE the new route's RSC payload begins fetching. This is what
  // makes the click feel instant. Mirrors the same skip-rules as
  // ViewTransitionsRouter (modifier keys, target=_blank, hash, mailto, etc.).
  useEffect(() => {
    if (typeof document === 'undefined') return

    const onClick = (e: MouseEvent) => {
      if (!firstDoneRef.current) return
      if (e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      // NOTE: deliberately NOT checking e.defaultPrevented — ViewTransitionsRouter
      // calls preventDefault on every internal link in its capture-phase handler,
      // which would otherwise suppress this loader entirely.

      const target = e.target as Element | null
      const link = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!link) return
      if (link.target && link.target !== '' && link.target !== '_self') return
      if (link.hasAttribute('download')) return
      if (link.dataset.loader === 'off') return

      const href = link.getAttribute('href')
      if (!href) return
      if (href.startsWith('#')) return
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return

      try {
        const url = new URL(href, window.location.href)
        if (url.origin !== window.location.origin) return
        const dest = url.pathname + url.search + url.hash
        const current =
          window.location.pathname + window.location.search + window.location.hash
        if (dest === current) return
      } catch {
        return
      }

      if (navTimerRef.current) clearTimeout(navTimerRef.current)
      navStartRef.current = performance.now()
      setMode('nav')
    }

    // Capture phase so we run alongside ViewTransitionsRouter (which also uses
    // capture). stopPropagation between document-level listeners only blocks
    // other nodes — our handler still fires.
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])

  // Pathname change → schedule HIDE (with min-display window so the loader
  // never flashes when prefetched/cached routes arrive instantly). Also
  // covers browser back/forward and programmatic router.push, where the
  // click handler above never fires — in that case we show + hide here.
  useEffect(() => {
    if (!firstDoneRef.current) return
    if (prevPath.current === null) {
      prevPath.current = pathname
      return
    }
    if (prevPath.current === pathname) return
    prevPath.current = pathname

    if (navTimerRef.current) clearTimeout(navTimerRef.current)

    // Back/forward case: no click happened, mode is null. Arm now.
    if (navStartRef.current === 0) {
      navStartRef.current = performance.now()
      setMode('nav')
    }

    const elapsed = performance.now() - navStartRef.current
    const minDisplay = reduceMotion ? 160 : NAV_MIN_DISPLAY_MS
    const remaining = Math.max(minDisplay - elapsed, 50)

    navTimerRef.current = setTimeout(() => {
      setMode(null)
      navStartRef.current = 0
    }, remaining)
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
  const wipeDuration = reduceMotion ? 0.2 : 0.7
  const wipeDelay = reduceMotion ? 0 : 0.4

  return (
    <motion.div
      key="first-load"
      role="status"
      aria-live="polite"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden bg-black"
    >
      <span className="sr-only">{label}</span>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.96, 1, 1, 0.98] }}
          transition={{ duration: 1.5, times: [0, 0.2, 0.78, 1], ease: 'easeOut' }}
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
        className="absolute inset-x-0 top-0 z-10 bg-black"
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
      className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--color-bg)]/[0.78] backdrop-blur-xl backdrop-saturate-[1.15] supports-[backdrop-filter]:bg-[var(--color-bg)]/[0.62]"
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
