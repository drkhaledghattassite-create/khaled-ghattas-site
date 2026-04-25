'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import Lenis from 'lenis'

/**
 * Mounts Lenis smooth-scroll at the document root.
 * lerp ≈ 0.1 (Studio Freight default) — see BEHAVIORS.md §1.1.
 * Applies to both RTL and LTR — Lenis handles scroll direction internally.
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale()

  useEffect(() => {
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
