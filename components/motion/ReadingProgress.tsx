'use client'

import { motion, useScroll, useSpring } from 'motion/react'
import { useReducedMotion } from '@/lib/motion/hooks'

export function ReadingProgress() {
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  // Spring under normal motion gives the progress bar its kinetic feel.
  // Under reduced-motion the value is fed through directly — the bar still
  // tracks scroll position, just without the spring overshoot/settle.
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 32 })

  return (
    <motion.div
      aria-hidden
      style={{ scaleX: reduceMotion ? scrollYProgress : scaleX, transformOrigin: 'left' }}
      className="fixed inset-x-0 top-0 z-[80] h-[2px] bg-[var(--color-accent)]"
    />
  )
}
