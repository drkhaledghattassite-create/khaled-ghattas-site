'use client'

import { useEffect, useState } from 'react'

export type ThemeColors = {
  grid: string
  text: string
  textMuted: string
  accent: string
  surface: string
  border: string
}

/**
 * SSR fallback values. These hex literals look like a Qalem-rule violation
 * (hardcoded hex outside app/globals.css) but they only render during SSR
 * and the first client paint — `read()` below replaces them with the live
 * CSS-var values via `getComputedStyle` on mount and on every theme change.
 *
 * They are pinned to the Qalem v2 LIGHT palette in app/globals.css. If the
 * tokens change there, update this object too (the audit cost is one extra
 * find-and-replace; the benefit is zero CLS-from-color-shift on first
 * paint of charts that depend on these tokens, like /admin overview).
 */
const DEFAULTS: ThemeColors = {
  grid: '#E5E5E5',
  text: '#0A0A0A',
  textMuted: '#737373',
  accent: '#B85440',
  surface: '#FFFFFF',
  border: '#E5E5E5',
}

function read(): ThemeColors {
  if (typeof window === 'undefined') return DEFAULTS
  const root = getComputedStyle(document.documentElement)
  const get = (name: string, fallback: string) =>
    root.getPropertyValue(name).trim() || fallback
  return {
    grid: get('--color-border', DEFAULTS.grid),
    text: get('--color-fg1', DEFAULTS.text),
    textMuted: get('--color-fg3', DEFAULTS.textMuted),
    accent: get('--color-accent', DEFAULTS.accent),
    surface: get('--color-bg-elevated', DEFAULTS.surface),
    border: get('--color-border', DEFAULTS.border),
  }
}

export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(DEFAULTS)

  useEffect(() => {
    setColors(read())
    const observer = new MutationObserver(() => setColors(read()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return colors
}
