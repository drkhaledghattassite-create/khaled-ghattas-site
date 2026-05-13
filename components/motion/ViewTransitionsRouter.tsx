'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Global anchor-click interceptor that wraps internal navigation in
 * `document.startViewTransition` for premium crossfade + matched-element
 * transitions.
 *
 * Falls back silently in browsers that don't support the View Transitions API
 * — anchor clicks behave normally (Next.js Link's own onClick handles them).
 *
 * A11y:
 *  - After SPA navigation (anchor-hijack OR any pathname change), shift focus
 *    to the layout's `#main-content` so screen reader users hear the new page
 *    landmark and Tab order resumes from the top of the new content rather
 *    than continuing from the clicked link's position deep in the prior page
 *    (WCAG 2.4.3 Focus Order). The receiver must carry `tabIndex={-1}` so it
 *    is programmatically focusable.
 *
 * Behavior:
 *  - Capture-phase listener runs BEFORE Next.js Link's onClick. We preventDefault
 *    so the Link's bubbled onClick early-returns, then push via the App-Router
 *    wrapped in startViewTransition.
 *  - We do NOT stopPropagation: React's synthetic event delegation needs the
 *    bubble phase to fire user-attached `onClick` handlers (e.g. closing a
 *    mobile drawer when one of its links is tapped). Next.js Link's internal
 *    onClick checks `defaultPrevented` and bails, so there's no double-nav.
 *  - We respect modifier keys, target="_blank", non-left-clicks, hash-only links,
 *    mailto/tel, and cross-origin URLs — these all pass through untouched.
 */
export function ViewTransitionsRouter() {
  const router = useRouter()
  const pathname = usePathname()

  // Focus-reset on every pathname change. usePathname is updated by
  // router.push, browser back/forward, and direct navigation alike, so a
  // single effect handles all entry points (anchor hijack, programmatic
  // router.push, popstate, locale switch). The initial-mount run is skipped
  // implicitly because document.activeElement is body at first render and
  // the visible focus indicator would not be perceived as a "jump".
  useEffect(() => {
    if (typeof document === 'undefined') return
    // Skip the very first run on mount — initial page load doesn't need a
    // synthetic focus shift; users land on the page already oriented.
    if (sessionStorage.getItem('kg:vtr:initialized') !== '1') {
      sessionStorage.setItem('kg:vtr:initialized', '1')
      return
    }
    const main = document.getElementById('main-content')
    if (!main) return
    // requestAnimationFrame so the focus shift lands after the view
    // transition's frame commit. Without rAF, screen readers can re-announce
    // the prior page's region.
    requestAnimationFrame(() => {
      main.focus({ preventScroll: true })
    })
  }, [pathname])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!('startViewTransition' in document)) return

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (e.defaultPrevented) return

      const target = e.target as Element | null
      const link = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!link) return
      if (link.target && link.target !== '' && link.target !== '_self') return
      if (link.hasAttribute('download')) return
      if (link.dataset.viewTransition === 'off') return

      const href = link.getAttribute('href')
      if (!href) return
      if (href.startsWith('#')) return
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return

      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return

      const dest = url.pathname + url.search + url.hash
      const current = window.location.pathname + window.location.search + window.location.hash
      if (dest === current) return

      e.preventDefault()

      const transitionFn = (
        document as Document & {
          startViewTransition?: (cb: () => void | Promise<void>) => unknown
        }
      ).startViewTransition

      if (transitionFn) {
        transitionFn.call(document, () => {
          router.push(dest)
        })
      } else {
        router.push(dest)
      }
    }

    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [router])

  return null
}
