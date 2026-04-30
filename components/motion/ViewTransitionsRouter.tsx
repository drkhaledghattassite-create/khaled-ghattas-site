'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Global anchor-click interceptor that wraps internal navigation in
 * `document.startViewTransition` for premium crossfade + matched-element
 * transitions.
 *
 * Falls back silently in browsers that don't support the View Transitions API
 * — anchor clicks behave normally (Next.js Link's own onClick handles them).
 *
 * Behavior:
 *  - Capture-phase listener runs BEFORE Next.js Link's onClick. We preventDefault
 *    so the Link's bubbled onClick early-returns, then push via the App-Router
 *    wrapped in startViewTransition.
 *  - We respect modifier keys, target="_blank", non-left-clicks, hash-only links,
 *    mailto/tel, and cross-origin URLs — these all pass through untouched.
 */
export function ViewTransitionsRouter() {
  const router = useRouter()

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
      e.stopPropagation()

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
