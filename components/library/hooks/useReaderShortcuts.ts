'use client'

import { useEffect } from 'react'

/**
 * Desktop-only keyboard shortcuts for the reader.
 *
 * Bindings (RTL-aware, the brief specifies these directly):
 *   ArrowLeft   → next page    (RTL: forward = leftward in Arabic)
 *   ArrowRight  → previous page
 *   Space       → next page
 *   b           → toggle bookmark on current page
 *   f           → toggle fullscreen
 *   t           → cycle theme
 *   ?           → open shortcuts overlay
 *   Escape      → close overlay; if none open, exit fullscreen
 *
 * The `onArrowLeft` / `onArrowRight` callbacks are passed by the desktop
 * shell already mapped to the correct direction — this hook does not
 * apply RTL flipping itself. That keeps the binding semantics clean
 * ("Left arrow = the action mapped to leftward") regardless of locale.
 *
 * We attach to `window` so the shortcuts work even when focus is on a
 * non-input element. We bail out when an input/textarea is focused so
 * typing in the go-to-page field doesn't fire shortcuts.
 *
 * Returning nothing is intentional — the hook installs side effects only.
 */
export type ReaderShortcuts = {
  onArrowLeft: () => void
  onArrowRight: () => void
  onSpace: () => void
  onToggleBookmark: () => void
  onToggleFullscreen: () => void
  onOpenShortcuts: () => void
  onEscape: () => void
  enabled?: boolean
}

export function useReaderShortcuts({
  onArrowLeft,
  onArrowRight,
  onSpace,
  onToggleBookmark,
  onToggleFullscreen,
  onOpenShortcuts,
  onEscape,
  enabled = true,
}: ReaderShortcuts): void {
  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return true
      if (el.isContentEditable) return true
      return false
    }

    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        // Allow Escape to close overlays even from inputs.
        if (e.key === 'Escape') onEscape()
        return
      }

      // Don't hijack when the user is using a modifier (Cmd-F, Ctrl-T, etc.).
      if (e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          onArrowLeft()
          break
        case 'ArrowRight':
          e.preventDefault()
          onArrowRight()
          break
        case ' ':
        case 'Spacebar':
          e.preventDefault()
          onSpace()
          break
        case 'b':
        case 'B':
          e.preventDefault()
          onToggleBookmark()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          onToggleFullscreen()
          break
        case '?':
          e.preventDefault()
          onOpenShortcuts()
          break
        case 'Escape':
          e.preventDefault()
          onEscape()
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    enabled,
    onArrowLeft,
    onArrowRight,
    onSpace,
    onToggleBookmark,
    onToggleFullscreen,
    onOpenShortcuts,
    onEscape,
  ])
}
