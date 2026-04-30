'use client'

import { useEffect, useRef, useState } from 'react'
import {
  useReducedMotion as useFramerReducedMotion,
  useScroll,
  useVelocity,
  type MotionValue,
} from 'motion/react'

export function useReducedMotion(): boolean {
  const value = useFramerReducedMotion()
  return value ?? false
}

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [breakpoint])

  return isMobile
}

export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)')
    setIsTouch(mq.matches)
    const update = () => setIsTouch(mq.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isTouch
}

export function useScrollReveal<T extends Element = HTMLDivElement>(
  options?: IntersectionObserverInit & { once?: boolean },
) {
  const ref = useRef<T | null>(null)
  const [revealed, setRevealed] = useState(false)
  const once = options?.once ?? true

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setRevealed(false)
        }
      },
      {
        threshold: options?.threshold ?? 0.1,
        rootMargin: options?.rootMargin ?? '0px 0px -10% 0px',
      },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [once, options?.threshold, options?.rootMargin])

  return { ref, revealed }
}

/**
 * Returns the live vertical scroll velocity (px/s) as a MotionValue.
 * Use to gate heavier animations on fast scrolls — read with
 * useMotionValueEvent('change') or feed into useTransform.
 */
export function useScrollVelocity(): MotionValue<number> {
  const { scrollY } = useScroll()
  return useVelocity(scrollY)
}

export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let raf = 0

    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        const scrollTop = window.scrollY
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight
        setProgress(docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0)
        raf = 0
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return progress
}
