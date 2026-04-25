'use client'

import type { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { LenisProvider } from './LenisProvider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    // `reducedMotion="user"` short-circuits non-essential motion lib animations
    // (transforms, opacity, scale) when the OS reports prefers-reduced-motion.
    // Continuous loops still need explicit useReducedMotion gating per component.
    <MotionConfig reducedMotion="user">
      <LenisProvider>{children}</LenisProvider>
    </MotionConfig>
  )
}
