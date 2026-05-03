'use client'

import { useEffect, useState } from 'react'

/**
 * Reader-scoped viewport hook with hydration safety.
 *
 * The reader picks Mobile vs Desktop layouts based on viewport width. A
 * naive `window.innerWidth < 768` read inside render runs at SSR time
 * (returning the wrong value) and re-runs at hydration time (returning
 * a different value), producing a hydration mismatch. We sidestep that
 * with two flags:
 *
 * - `mounted` flips true inside a client-only effect, after hydration.
 * - `variant` reads window.innerWidth on first render BUT defaults to
 *   undefined; callers should treat undefined as "not yet known" and
 *   render a loading placeholder until both `mounted` and `variant`
 *   resolve.
 *
 * Returning `undefined` until mount is the only way to avoid SSR/CSR
 * divergence here. Once mount happens, the hook listens to a media-
 * query change event and updates synchronously — no flash on resize.
 *
 * The brief specifies a 768px breakpoint (md). Components consuming
 * this hook should render Mobile when variant === 'mobile' and Desktop
 * when variant === 'desktop'.
 */
export type ReaderVariant = 'mobile' | 'desktop'

export function useViewport(breakpoint = 768): {
  variant: ReaderVariant | undefined
  mounted: boolean
} {
  const [mounted, setMounted] = useState(false)
  const [variant, setVariant] = useState<ReaderVariant | undefined>(undefined)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setMounted(true)

    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const apply = () => setVariant(mq.matches ? 'mobile' : 'desktop')
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [breakpoint])

  return { variant, mounted }
}
