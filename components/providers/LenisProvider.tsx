'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import Lenis from 'lenis'

/**
 * Mounts Lenis smooth-scroll at the document root.
 *
 * Honors prefers-reduced-motion: when set, the Lenis instance is not started
 * so the browser falls back to native scroll. Sticky-scroll choreography in
 * InterviewRotator still works without Lenis (it reads scrollYProgress, which
 * the browser's native scroll feeds just as well as Lenis's smoothed scroll).
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    })

    ;(window as unknown as { __lenis?: Lenis }).__lenis = lenis

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      delete (window as unknown as { __lenis?: Lenis }).__lenis
    }
  }, [locale])

  return <>{children}</>
}
