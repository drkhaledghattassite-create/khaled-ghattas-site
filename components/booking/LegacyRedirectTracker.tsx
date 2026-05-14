'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { track } from '@vercel/analytics'
import { usePathname, useRouter } from '@/lib/i18n/navigation'

const LEGACY_MARKER = 'legacy-booking'

/**
 * Side-effect-only component that detects the `?from=legacy-booking`
 * marker dropped by the /booking → /booking/tours 308 redirect, fires
 * a Vercel Analytics event so we can see how many users still hit the
 * legacy URL, then strips the param from the URL via `router.replace`
 * so the address bar shows the canonical /booking/tours.
 *
 * Mount once at the top of /booking/tours (or wherever a legacy-marker
 * redirect lands). Renders nothing. Idempotent — guarded by a ref so a
 * StrictMode double-invoke doesn't double-count or double-replace.
 *
 * Marker value is intentionally specific so analytics filtering by name
 * is collision-free. No PII, no user-context — just the bare event.
 */
export function LegacyRedirectTracker() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    if (searchParams?.get('from') !== LEGACY_MARKER) return
    firedRef.current = true
    track('legacy-booking-redirect')
    // Strip the marker by replacing with the param-free pathname. The
    // i18n router auto-prefixes locale when needed, so this works for
    // /booking/tours (ar) and /en/booking/tours (en) alike.
    router.replace(pathname, { scroll: false })
  }, [searchParams, router, pathname])

  return null
}
