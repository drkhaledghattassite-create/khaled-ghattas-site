'use client'

import type { ReactNode } from 'react'
import { LenisProvider } from './LenisProvider'

export function Providers({ children }: { children: ReactNode }) {
  return <LenisProvider>{children}</LenisProvider>
}
