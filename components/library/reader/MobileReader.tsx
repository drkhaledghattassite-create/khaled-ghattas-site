'use client'

/**
 * MobileReader — full-bleed reading experience for viewports < 768px.
 *
 * The PDF page fills 100% of the viewport. No card, no border, no padding.
 * The themed reader-surface fills letterboxing.
 *
 * Chrome (top + bottom bars) is hidden by default and toggled via:
 *   - tapping the middle 40% of the viewport
 *   - any pointer activity (which also resets a 3s auto-hide timer)
 *
 * Page navigation:
 *   - swipe right (RTL leading→trailing) → previous page
 *   - swipe left  (RTL trailing→leading) → next page
 *   - drag past 25% of width commits, otherwise snaps back
 *   - tap leading 30% → previous page
 *   - tap trailing 30% → next page
 *
 * Pinch-to-zoom: double-tap toggles between fit-width and 2x zoom. We
 * deliberately did NOT implement true pinch — it's a non-trivial gesture
 * to ship reliably across iOS/Android, and the brief allows the double-
 * tap fallback. Documented in the orchestrator file header.
 */

import { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'motion/react'
import { useRouter } from '@/lib/i18n/navigation'
import { Page } from 'react-pdf'
import { EASE_EDITORIAL } from '@/lib/motion/variants'
import { useReducedMotion } from '@/lib/motion/hooks'
import type { UseReaderStateResult } from '../hooks/useReaderState'
import { useAutoHideChrome } from '../hooks/useAutoHideChrome'
import { useSwipeGesture } from '../hooks/useSwipeGesture'
import { useDownload } from '../hooks/useDownload'
import { ReaderTopBar } from './ReaderTopBar'
import { ReaderBottomBar } from './ReaderBottomBar'
import { ReaderSettingsSheet } from './ReaderSettingsSheet'

const DRAG_COMMIT_THRESHOLD = 0.25 // 25% of width

export function MobileReader({
  title,
  isRtl,
  state,
  containerWidth,
  containerHeight,
  pdfUrl,
  slug,
}: {
  title: string
  isRtl: boolean
  state: UseReaderStateResult
  containerWidth: number
  containerHeight: number
  pdfUrl: string
  slug: string
}) {
  const reduceMotion = useReducedMotion()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const { isDownloading, downloadCurrentPage, downloadPages } = useDownload(
    pdfUrl,
    slug,
  )

  const [settingsOpen, setSettingsOpen] = useState(false)
  // Double-tap zoom: 1 = fit width, 2 = zoomed
  const [zoomLevel, setZoomLevel] = useState<1 | 2>(1)
  // Tracks the last middle-tap time for double-tap zoom detection.
  // Reset to 0 by edge taps so the window doesn't span a navigation.
  const lastTapRef = useRef(0)

  // Show chrome briefly on initial mount so users can discover the
  // controls (settings cog, close button, scrubber) — same UX as
  // Apple Books / Kindle. The 3s auto-hide kicks in immediately and
  // the bars fade away unless the user interacts.
  const { visible, bump, setVisible } = useAutoHideChrome(containerRef, {
    initiallyVisible: true,
    hideMs: 3000,
    forceVisible: settingsOpen,
  })

  // Middle-tap behaves as: first tap → toggle chrome; second middle tap
  // within 350ms → toggle zoom (and undo the chrome toggle since the user
  // clearly meant "zoom"). Edge taps reset the double-tap window so a
  // leading/trailing tap does not poison the next middle tap.
  const handleTapMiddle = useCallback(() => {
    const now = Date.now()
    if (now - lastTapRef.current < 350) {
      // Double-tap detected — toggle zoom and reset the window.
      setZoomLevel((z) => (z === 1 ? 2 : 1))
      lastTapRef.current = 0
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(8)
        } catch {
          // Silent.
        }
      }
      return
    }
    lastTapRef.current = now
    setVisible(!visible)
    if (!visible) bump()
  }, [bump, setVisible, visible])

  const handleTapLeading = useCallback(() => {
    lastTapRef.current = 0
    state.goToPage(state.currentPage - 1)
    bump()
  }, [bump, state])

  const handleTapTrailing = useCallback(() => {
    lastTapRef.current = 0
    state.goToPage(state.currentPage + 1)
    bump()
  }, [bump, state])

  const swipe = useSwipeGesture({
    onTapLeading: handleTapLeading,
    onTapTrailing: handleTapTrailing,
    onTapMiddle: handleTapMiddle,
    isRtl,
    enabled: zoomLevel === 1,
  })

  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (zoomLevel !== 1) return
      const offset = info.offset.x
      const threshold = containerWidth * DRAG_COMMIT_THRESHOLD
      if (Math.abs(offset) < threshold) {
        // Snap back — motion resets via dragConstraints.
        return
      }
      // Leftward swipe = next page in any locale (Arabic forward = leftward;
      // LTR follows the standard "swipe page off to reveal next" gesture
      // which also goes leftward). Rightward swipe = previous in both.
      // The unused `isRtl` prop is intentionally kept on this hook for
      // symmetry with the desktop variant; gestures are direction-agnostic.
      if (offset < 0) {
        state.goToPage(state.currentPage + 1)
      } else {
        state.goToPage(state.currentPage - 1)
      }
      // Haptic on page turn.
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(10)
        } catch {
          // Silent.
        }
      }
      bump()
    },
    [bump, containerWidth, state, zoomLevel],
  )

  const handleScrubberCommit = useCallback(
    (page: number) => {
      // Scrubber jumps are NOT animated — instant, like Kindle.
      state.goToPage(page, { animated: false })
      bump()
    },
    [bump, state],
  )

  const handleClose = useCallback(() => {
    // Per brief: router.back() on mobile. Defensive fallback if there's
    // no history (direct deep link → exits the app); we redirect to the
    // library overview in that case so the user lands somewhere useful.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/dashboard/library')
    }
  }, [router])

  const handleToggleBookmark = useCallback(() => {
    void state.toggleBookmark(state.currentPage)
    bump()
  }, [bump, state])

  // Keyboard / switch-control nav: identical to the desktop bottom bar
  // pattern. Single-page step (vs desktop's spread step of 2) because
  // the mobile reader renders one page at a time.
  const handlePrevPage = useCallback(() => {
    state.goToPage(state.currentPage - 1)
    bump()
  }, [bump, state])

  const handleNextPage = useCallback(() => {
    state.goToPage(state.currentPage + 1)
    bump()
  }, [bump, state])

  const isAtFirst = state.currentPage <= 1
  const isAtLast =
    state.totalPages != null && state.currentPage >= state.totalPages

  // Page sizing: when zoomed, 2x base width and overflow scrolls within
  // the page wrapper. When fit-width, page fills viewport width with a
  // small safety margin.
  const baseWidth = Math.min(containerWidth, 900)
  const pageWidth = zoomLevel === 2 ? baseWidth * 2 : baseWidth

  // Page-turn slide direction. In RTL, advancing means slide-in from
  // the right (positive x); LTR is mirrored.
  const enterX = reduceMotion
    ? 0
    : (isRtl ? 1 : -1) * state.pageDirection * (containerWidth * 0.15)
  const exitX = reduceMotion ? 0 : -enterX

  return (
    <div
      ref={containerRef}
      onTouchStart={(e) => {
        swipe.onTouchStart(e)
        bump()
      }}
      onTouchEnd={swipe.onTouchEnd}
      className="absolute inset-0 overflow-hidden"
    >
      <ReaderTopBar
        variant="mobile"
        visible={visible}
        title={title}
        isRtl={isRtl}
        saveState={state.saveState}
        onClose={handleClose}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* PDF page area — full bleed */}
      <div
        className={`absolute inset-0 flex items-center justify-center ${
          zoomLevel === 2 ? 'overflow-auto' : 'overflow-hidden'
        }`}
      >
        <motion.div
          key="page-frame"
          drag={zoomLevel === 1 && !reduceMotion ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="flex select-none items-center justify-center"
          style={{
            // Reserve at least the viewport height so the page is centered
            // even when its rendered height is shorter than the viewport.
            minHeight: containerHeight,
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={state.currentPage}
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, x: enterX }
              }
              animate={{ opacity: 1, x: 0 }}
              exit={
                reduceMotion ? { opacity: 0 } : { opacity: 0, x: exitX }
              }
              transition={{ duration: 0.25, ease: EASE_EDITORIAL }}
              className="flex items-center justify-center"
            >
              <Page
                pageNumber={state.currentPage}
                width={pageWidth}
                renderTextLayer
                renderAnnotationLayer
                className="bg-[var(--reader-surface-elev)]"
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      <ReaderBottomBar
        variant="mobile"
        visible={visible}
        currentPage={state.currentPage}
        totalPages={state.totalPages}
        isRtl={isRtl}
        isPageBookmarked={state.isPageBookmarked(state.currentPage)}
        onToggleBookmark={handleToggleBookmark}
        onScrubberCommit={handleScrubberCommit}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        isAtFirst={isAtFirst}
        isAtLast={isAtLast}
      />

      <ReaderSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentPage={state.currentPage}
        totalPages={state.totalPages}
        onGoToPage={(p) => state.goToPage(p, { animated: false })}
        bookmarks={state.bookmarks}
        onBookmarksJump={(p) => state.goToPage(p, { animated: false })}
        onBookmarksUpdateLabel={state.updateBookmarkLabel}
        onDownloadCurrentPage={() => downloadCurrentPage(state.currentPage)}
        onDownloadBookmarkPage={downloadCurrentPage}
        onDownloadPages={downloadPages}
        isDownloading={isDownloading}
        isRtl={isRtl}
      />
    </div>
  )
}
