'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PROXIMITY_PX = 220
const MOUSEMOVE_THROTTLE_MS = 100
const HOVER_DELAY_MS = 60

type NetworkInformation = {
  saveData?: boolean
  effectiveType?: string
}

/**
 * Premium-feel link prefetching:
 *  - On `mouseenter` on any internal anchor → prefetch immediately (after 60ms
 *    debounce so flick-over doesn't trigger).
 *  - On `mousemove` → check distance to nearby internal anchors; prefetch the
 *    closest one inside `PROXIMITY_PX` radius.
 *
 * Skips: `Save-Data` users, slow connections, modifier-key clicks (handled
 * elsewhere), download/external/hash links, and links already prefetched.
 */
export function ProximityPrefetch() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const conn =
      (navigator as unknown as { connection?: NetworkInformation }).connection
    if (conn?.saveData) return
    if (conn?.effectiveType && /(^|-)(2g|slow-2g)$/.test(conn.effectiveType)) return

    const prefetched = new Set<string>()
    const hoverTimers = new WeakMap<HTMLAnchorElement, ReturnType<typeof setTimeout>>()

    const isInternalAnchor = (a: HTMLAnchorElement): string | null => {
      if (a.target && a.target !== '' && a.target !== '_self') return null
      if (a.hasAttribute('download')) return null
      const href = a.getAttribute('href')
      if (!href) return null
      if (href.startsWith('#')) return null
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return null
      try {
        const url = new URL(href, window.location.href)
        if (url.origin !== window.location.origin) return null
        return url.pathname + url.search
      } catch {
        return null
      }
    }

    const prefetch = (path: string) => {
      if (prefetched.has(path)) return
      prefetched.add(path)
      try {
        router.prefetch(path)
      } catch {
        // ignore
      }
    }

    const onMouseEnter = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      const a = t.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a) return
      const path = isInternalAnchor(a)
      if (!path) return

      const existing = hoverTimers.get(a)
      if (existing) clearTimeout(existing)
      const timer = setTimeout(() => prefetch(path), HOVER_DELAY_MS)
      hoverTimers.set(a, timer)
    }

    const onMouseLeave = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      const a = t.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a) return
      const existing = hoverTimers.get(a)
      if (existing) {
        clearTimeout(existing)
        hoverTimers.delete(a)
      }
    }

    let lastMove = 0
    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now()
      if (now - lastMove < MOUSEMOVE_THROTTLE_MS) return
      lastMove = now

      const x = e.clientX
      const y = e.clientY
      const links = document.querySelectorAll<HTMLAnchorElement>('a[href]')
      let closest: { a: HTMLAnchorElement; path: string; dist: number } | null = null

      for (const a of links) {
        const path = isInternalAnchor(a)
        if (!path) continue
        if (prefetched.has(path)) continue
        const r = a.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) continue
        // Skip if anchor is far off-screen
        if (r.bottom < -100 || r.top > window.innerHeight + 100) continue
        if (r.right < -100 || r.left > window.innerWidth + 100) continue
        const cx = Math.max(r.left, Math.min(x, r.right))
        const cy = Math.max(r.top, Math.min(y, r.bottom))
        const dx = x - cx
        const dy = y - cy
        const dist = Math.hypot(dx, dy)
        if (dist > PROXIMITY_PX) continue
        if (!closest || dist < closest.dist) closest = { a, path, dist }
      }

      if (closest) prefetch(closest.path)
    }

    document.addEventListener('mouseenter', onMouseEnter, { capture: true, passive: true })
    document.addEventListener('mouseleave', onMouseLeave, { capture: true, passive: true })
    document.addEventListener('mousemove', onMouseMove, { passive: true })

    return () => {
      document.removeEventListener('mouseenter', onMouseEnter, { capture: true })
      document.removeEventListener('mouseleave', onMouseLeave, { capture: true })
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [router])

  return null
}
