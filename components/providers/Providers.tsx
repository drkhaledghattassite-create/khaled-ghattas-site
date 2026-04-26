'use client'

import type { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { LenisProvider } from './LenisProvider'
import { ThemeProvider } from './ThemeProvider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <LenisProvider>{children}</LenisProvider>
      </MotionConfig>
    </ThemeProvider>
  )
}
