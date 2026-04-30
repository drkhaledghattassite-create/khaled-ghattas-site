/**
 * Wrap a synchronous navigation/state change in `document.startViewTransition`
 * for premium crossfade. Falls back to running the callback directly in
 * browsers that don't support View Transitions.
 *
 * Use this for programmatic navigations (e.g. `router.push()` inside an
 * onClick handler). For anchor clicks, ViewTransitionsRouter handles it
 * globally — you don't need to call this manually.
 */
export function withViewTransition(fn: () => void): void {
  if (typeof document === 'undefined') {
    fn()
    return
  }
  const startVt = (
    document as Document & {
      startViewTransition?: (cb: () => void | Promise<void>) => unknown
    }
  ).startViewTransition
  if (!startVt) {
    fn()
    return
  }
  startVt.call(document, fn)
}

/**
 * Imperatively show AppLoader's nav overlay. Use for actions that don't
 * change pathname — e.g. `window.location.href = ...` to an external URL.
 * Pathname-change-driven navigations get the loader automatically.
 */
export function showNavLoader(durationMs?: number): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('kg:loader:show', {
      detail: { duration: durationMs },
    }),
  )
}
