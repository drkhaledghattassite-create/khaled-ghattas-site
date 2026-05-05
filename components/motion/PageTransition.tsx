'use client'

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { EASE_EDITORIAL } from '@/lib/motion/variants'

export function PageTransition({ children }: { children: ReactNode }) {
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
