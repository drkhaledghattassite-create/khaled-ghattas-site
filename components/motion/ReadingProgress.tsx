'use client'

import { motion, useScroll, useSpring } from 'motion/react'

export function ReadingProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 32 })

  return (
    <motion.div
      aria-hidden
      style={{ scaleX, transformOrigin: 'left' }}
      className="fixed inset-x-0 top-0 z-[80] h-[2px] bg-[var(--color-accent)]"
    />
  )
}
