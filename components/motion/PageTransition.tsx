'use client'

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion/hooks'
import { EASE_EDITORIAL } from '@/lib/motion/variants'

export function PageTransition({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <>{children}</>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: EASE_EDITORIAL }}
    >
      {children}
    </motion.div>
  )
}
