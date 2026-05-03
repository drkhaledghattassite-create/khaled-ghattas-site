'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Auto-hide chrome bars (top + bottom) after a period of inactivity.
 *
 * Both reader variants share this behavior:
 *   - Initially visible (or hidden, per `initiallyVisible`).
 *   - Any pointer/key/touch activity shows the bars and resets a 3s timer.
 *   - When the timer expires, bars fade out.
 *   - `forceVisible` (loading state, modal open, etc.) keeps bars on.
 *
 * Returned `bump()` is the public "I noticed activity" signal. Components
 * call it on tap/click handlers; we also attach passive listeners on the
 * provided `targetRef` for mousemove/touchstart/keydown so general activity
 * over the surface counts.
 *
 * The hideMs default of 3000 matches the brief.
 */
export type AutoHideOptions = {
  initiallyVisible?: boolean
  hideMs?: number
  // When true, bars stay visible regardless of the timer (loading,
  // settings sheet open, etc.). When the lock clears, the timer
  // resumes from the next bump.
  forceVisible?: boolean
}

export function useAutoHideChrome(
  targetRef: React.RefObject<HTMLElement | null>,
  opts: AutoHideOptions = {},
): {
  visible: boolean
  bump: () => void
  setVisible: (v: boolean) => void
} {
  const { initiallyVisible = false, hideMs = 3000, forceVisible = false } = opts

  const [visible, setVisible] = useState(initiallyVisible)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const bump = useCallback(() => {
    setVisible(true)
    clearTimer()
    if (!forceVisible) {
      timerRef.current = setTimeout(() => setVisible(false), hideMs)
    }
  }, [clearTimer, forceVisible, hideMs])

  // When forceVisible toggles on, lock to visible and clear the hide timer.
  // When it toggles off, restart the timer from now so bars don't snap away
  // immediately after a modal closes.
  useEffect(() => {
    if (forceVisible) {
      setVisible(true)
      clearTimer()
    } else {
      // Fresh idle window after the lock releases.
      bump()
    }
    // bump is stable enough; clearTimer depends only on the local ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceVisible])

  // Attach passive activity listeners to the reader root. We don't fire on
  // mousemove for touch devices (it would re-show after each touch ends);
  // the mobile component invokes bump() explicitly on tap.
  useEffect(() => {
    const node = targetRef.current
    if (!node) return
    const onActivity = () => bump()
    node.addEventListener('mousemove', onActivity, { passive: true })
    node.addEventListener('keydown', onActivity)
    return () => {
      node.removeEventListener('mousemove', onActivity)
      node.removeEventListener('keydown', onActivity)
    }
  }, [bump, targetRef])

  // Tear down the timer on unmount.
  useEffect(() => clearTimer, [clearTimer])

  return { visible, bump, setVisible }
}
