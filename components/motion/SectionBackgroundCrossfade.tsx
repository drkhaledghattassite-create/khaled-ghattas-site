'use client'

import { useEffect } from 'react'
import { useReducedMotion } from '@/lib/motion/hooks'

const TRANSITION_MS = 800
const TRANSITION_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

/**
 * Sets the document body background based on the section currently dominating
 * the viewport. Sections opt-in by declaring `data-bg="var(--color-bg-...)"`.
 * Transparent sections (no own bg) will show this body bg; opaque sections
 * mask it but the cross-fade still happens at section boundaries.
 *
 * Theme-aware: data-bg values reference CSS variables that flip in dark mode.
 */
export function SectionBackgroundCrossfade() {
  const reduce = useReducedMotion()

  useEffect(() => {
    if (typeof document === 'undefined') return

    const body = document.body
    body.style.transition = reduce
      ? 'background-color 0.15s linear'
      : `background-color ${TRANSITION_MS}ms ${TRANSITION_EASE}`

    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-bg]'))
    if (sections.length === 0) return

    let currentBg = ''

    const apply = (bg: string) => {
      if (bg === currentBg) return
      currentBg = bg
      body.style.backgroundColor = bg
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null
        for (const e of entries) {
          if (!e.isIntersecting) continue
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e
        }
        if (best) {
          const bg = (best.target as HTMLElement).dataset.bg
          if (bg) apply(bg)
        }
      },
      { threshold: [0, 0.15, 0.35, 0.55, 0.75, 0.95] },
    )

    sections.forEach((s) => observer.observe(s))

    return () => {
      observer.disconnect()
      body.style.transition = ''
      body.style.backgroundColor = ''
    }
  }, [reduce])

  return null
}
