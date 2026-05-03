'use client'

/**
 * Touch swipe gesture for the mobile reader.
 *
 * The mobile reader uses `motion/react` `drag="x"` on the page wrapper
 * for the visual drag-and-snap effect. This hook is for the simpler
 * "tap" detection that does NOT involve drag — taps inside the middle
 * 40% of the viewport toggle chrome, taps inside the leading 30%
 * jump backwards, taps inside the trailing 30% jump forwards.
 *
 * We intentionally split swipe (handled by motion's drag) from tap
 * (handled here). Combining them in a single touchstart/touchend
 * implementation produced subtle bugs where a slow drag was mis-
 * categorised as a tap; using motion for drag means motion handles
 * the velocity/distance heuristics and our tap path only fires on
 * pure taps (touchend within TAP_THRESHOLD_PX of touchstart).
 *
 * The hook returns the props caller spreads onto the touch surface.
 */

import { useCallback, useRef } from 'react'

type TouchPos = { x: number; y: number; t: number }

const TAP_THRESHOLD_PX = 10
const EDGE_ZONE_FRACTION = 0.3

export type SwipeGestureProps = {
  onTapLeading: () => void
  onTapTrailing: () => void
  onTapMiddle: () => void
  isRtl: boolean
  enabled?: boolean
}

export function useSwipeGesture({
  onTapLeading,
  onTapTrailing,
  onTapMiddle,
  isRtl,
  enabled = true,
}: SwipeGestureProps): {
  onTouchStart: (e: React.TouchEvent<HTMLElement>) => void
  onTouchEnd: (e: React.TouchEvent<HTMLElement>) => void
} {
  const startRef = useRef<TouchPos | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (!enabled) return
    const t0 = e.touches[0]
    if (!t0) return
    startRef.current = { x: t0.clientX, y: t0.clientY, t: Date.now() }
  }, [enabled])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (!enabled) return
      const start = startRef.current
      startRef.current = null
      if (!start) return
      const t1 = e.changedTouches[0]
      if (!t1) return

      // Don't fire tap-zone navigation when the user touched a button,
      // input, or form element. The motion drag handler captures the
      // page-area swipe; this guard prevents button taps from being
      // interpreted as edge taps.
      const target = e.target as HTMLElement | null
      if (target?.closest('button, input, [role="button"], form, a, [data-reader-no-tap]')) return

      const dx = t1.clientX - start.x
      const dy = t1.clientY - start.y
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)

      // Only treat true taps. Anything beyond the threshold is left for
      // motion's drag handler.
      if (absX >= TAP_THRESHOLD_PX || absY >= TAP_THRESHOLD_PX) return

      const rect = e.currentTarget.getBoundingClientRect()
      const xFrac = (t1.clientX - rect.left) / rect.width

      // In RTL, the leading side is the right edge (xFrac near 1).
      const isLeading = isRtl
        ? xFrac > 1 - EDGE_ZONE_FRACTION
        : xFrac < EDGE_ZONE_FRACTION
      const isTrailing = isRtl
        ? xFrac < EDGE_ZONE_FRACTION
        : xFrac > 1 - EDGE_ZONE_FRACTION

      if (isLeading) onTapLeading()
      else if (isTrailing) onTapTrailing()
      else onTapMiddle()
    },
    [enabled, isRtl, onTapLeading, onTapMiddle, onTapTrailing],
  )

  return { onTouchStart, onTouchEnd }
}
