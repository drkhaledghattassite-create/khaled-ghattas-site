'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Reader-only theme controller.
 *
 * Three themes: 'light' | 'sepia' | 'dark'. These are scoped to the reader's
 * outermost container via `data-reader-theme` and are independent of the
 * site's light/dark mode (which lives on `<html class="dark">`). Switching
 * the reader theme does NOT touch the rest of the site.
 *
 * Persisted in localStorage under key `reader-theme`. The default is `light`.
 *
 * Why localStorage and not a cookie: theme is a per-device preference and
 * has no SSR implication (we render the reader client-side via dynamic
 * import). A cookie would round-trip on every request unnecessarily.
 */
export type ReaderTheme = 'light' | 'sepia' | 'dark'

const STORAGE_KEY = 'reader-theme'
const VALID: ReaderTheme[] = ['light', 'sepia', 'dark']

export function useReaderTheme(): {
  theme: ReaderTheme
  setTheme: (next: ReaderTheme) => void
  cycleTheme: () => void
} {
  const [theme, setThemeState] = useState<ReaderTheme>('light')

  // Hydrate from storage on mount. We deliberately skip SSR — the reader
  // is rendered behind `next/dynamic` with `ssr: false`, so this effect
  // is the only path that runs.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored && (VALID as string[]).includes(stored)) {
        setThemeState(stored as ReaderTheme)
      }
    } catch {
      // localStorage may be disabled (e.g. private mode in older browsers);
      // fall back to default theme silently.
    }
  }, [])

  const setTheme = useCallback((next: ReaderTheme) => {
    setThemeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Persistence failure is non-fatal; the in-memory theme still applies.
    }
  }, [])

  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: ReaderTheme =
        current === 'light' ? 'sepia' : current === 'sepia' ? 'dark' : 'light'
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Persistence failure is non-fatal.
      }
      return next
    })
  }, [])

  return { theme, setTheme, cycleTheme }
}
