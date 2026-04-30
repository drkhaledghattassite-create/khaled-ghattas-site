'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'
import { useReducedMotion } from '@/lib/motion/hooks'

const INTERACTIVE_SELECTOR =
  'a[href], button, [role="button"], [data-cursor="hover"], input, textarea, select, [contenteditable="true"], summary, label[for]'
const TEXT_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, blockquote, li, span, [data-cursor="text"]'

type Mode = 'idle' | 'hover' | 'text'

/**
 * Custom premium cursor:
 *  - 6px solid dot (fast, follows pointer 1:1)
 *  - 36px ring (springy follow, expands on interactive elements)
 *  - On text contexts: shrinks ring + dot tint to muted
 *
 * Hidden on touch devices and when reduced motion is preferred.
 * Uses pointer-events:none + sits on a high-z layer so it doesn't intercept clicks.
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const [mode, setMode] = useState<Mode>('idle')
  const reduce = useReducedMotion()

  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)
  const ringX = useSpring(mouseX, { stiffness: 500, damping: 38, mass: 0.6 })
  const ringY = useSpring(mouseY, { stiffness: 500, damping: 38, mass: 0.6 })

  const lastModeRef = useRef<Mode>('idle')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (reduce) return

    const touch = window.matchMedia('(hover: none) and (pointer: coarse)')
    if (touch.matches) return
    setEnabled(true)
    document.documentElement.classList.add('has-custom-cursor')

    const onMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }

    const onPointerOver = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (!target || !('closest' in target)) return
      let next: Mode = 'idle'
      if (target.closest(INTERACTIVE_SELECTOR)) next = 'hover'
      else if (target.closest(TEXT_SELECTOR)) next = 'text'
      if (next !== lastModeRef.current) {
        lastModeRef.current = next
        setMode(next)
      }
    }

    const onLeave = () => {
      mouseX.set(-100)
      mouseY.set(-100)
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('pointerover', onPointerOver, { passive: true })
    window.addEventListener('mouseleave', onLeave, { passive: true })
    window.addEventListener('blur', onLeave, { passive: true })

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('pointerover', onPointerOver)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('blur', onLeave)
      document.documentElement.classList.remove('has-custom-cursor')
    }
  }, [mouseX, mouseY, reduce])

  if (!enabled) return null

  const ringScale = mode === 'hover' ? 1.55 : mode === 'text' ? 0.55 : 1
  const ringOpacity = mode === 'text' ? 0.3 : mode === 'hover' ? 0.95 : 0.55
  const dotScale = mode === 'hover' ? 0.6 : mode === 'text' ? 0.35 : 1

  return (
    <>
      {/* Ring (springy) */}
      <motion.div
        aria-hidden
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
          opacity: ringOpacity,
          scale: ringScale,
        }}
        transition={{ scale: { duration: 0.25, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.18 } }}
        className="pointer-events-none fixed left-0 top-0 z-[10000] h-9 w-9 rounded-full border-[1.5px] border-[var(--color-fg1)] mix-blend-difference will-change-transform"
      />
      {/* Dot (1:1) */}
      <motion.div
        aria-hidden
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
          scale: dotScale,
        }}
        transition={{ scale: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
        className="pointer-events-none fixed left-0 top-0 z-[10000] h-1.5 w-1.5 rounded-full bg-[var(--color-fg1)] mix-blend-difference will-change-transform"
      />
    </>
  )
}
