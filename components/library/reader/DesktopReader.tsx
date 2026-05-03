'use client'

/**
 * DesktopReader — two-page spread for viewports >= 768px.
 *
 * RTL ordering: in Arabic, the right page is the current page and the
 * left page is the next. This is the natural reading direction. We do
 * NOT use `flex-row-reverse` — `dir="rtl"` on the reader root already
 * flips flex children visually. Source order is `<Page n={cur} /><Page
 * n={cur+1} />` and RTL puts current on the right automatically.
 *
 * Side rail: open by default at >= 1280px (xl), closed below. The toggle
 * is a button in the top bar's RTL leading slot.
 *
 * Keyboard shortcuts (full set in useReaderShortcuts):
 *   ArrowLeft = next page (RTL: forward = leftward in Arabic)
 *   ArrowRight = previous page
 *   Space = next, b = bookmark, f = fullscreen, t = theme, ? = shortcuts,
 *   Esc = close overlay or exit fullscreen
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useRouter } from '@/lib/i18n/navigation'
import { Page } from 'react-pdf'
import { EASE_EDITORIAL } from '@/lib/motion/variants'
import { useReducedMotion } from '@/lib/motion/hooks'
import type {
  UseReaderStateResult,
  ResolvedOutlineEntry,
} from '../hooks/useReaderState'
import type { ReaderTheme } from '../hooks/useReaderTheme'
import { useAutoHideChrome } from '../hooks/useAutoHideChrome'
import { useReaderShortcuts } from '../hooks/useReaderShortcuts'
import { ReaderTopBar } from './ReaderTopBar'
import { ReaderBottomBar } from './ReaderBottomBar'
import { ReaderSideRail } from './ReaderSideRail'
import { ShortcutsOverlay } from './ShortcutsOverlay'

const SPREAD_MAX_WIDTH = 1100

export function DesktopReader({
  title,
  isRtl,
  state,
  theme,
  onThemeChange,
  cycleTheme,
  containerWidth,
  outlineEntries,
}: {
  // bookId is read from state via useReaderState; not consumed here.
  title: string
  isRtl: boolean
  state: UseReaderStateResult
  theme: ReaderTheme
  onThemeChange: (next: ReaderTheme) => void
  cycleTheme: () => void
  containerWidth: number
  // containerHeight reserved for future use (full-height spread sizing).
  outlineEntries: ResolvedOutlineEntry[] | null
}) {
  const reduceMotion = useReducedMotion()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Side rail: default-open at xl breakpoint (1280px), default-closed below.
  // We honor the initial state on first mount; subsequent user toggles
  // override it.
  const [sideRailOpen, setSideRailOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : false,
  )

  const { visible, bump } = useAutoHideChrome(containerRef, {
    initiallyVisible: true,
    hideMs: 3000,
    forceVisible: shortcutsOpen,
  })

  // Track fullscreen state. Browser fullscreen can also be exited via
  // Esc by the browser itself, so we listen for the change event rather
  // than only flipping our own state.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const handleClose = useCallback(() => {
    router.push('/dashboard/library')
  }, [router])

  const handleToggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return
    if (!document.fullscreenElement) {
      // The reader root is the right element to fullscreen — putting
      // <body> would also pull in the SiteHeader z-50 layer that the
      // route's parent layout still mounts.
      containerRef.current?.requestFullscreen?.().catch(() => {
        // Fullscreen request can fail (e.g. user gesture not detected,
        // browser denial). Silently ignore — feature is a nice-to-have.
      })
    } else {
      document.exitFullscreen?.().catch(() => {
        // Same — silently ignore.
      })
    }
  }, [])

  const handleToggleBookmark = useCallback(() => {
    void state.toggleBookmark(state.currentPage)
    bump()
  }, [bump, state])

  // RTL keyboard mapping: the brief specifies ArrowLeft = next, ArrowRight =
  // previous regardless of locale (because forward in Arabic is leftward,
  // and we want left-arrow = "advance" universally for this reader). We
  // map them directly here.
  const handleArrowLeft = useCallback(() => {
    state.goToPage(state.currentPage + (isRtl ? 1 : -1))
    bump()
  }, [bump, isRtl, state])

  const handleArrowRight = useCallback(() => {
    state.goToPage(state.currentPage + (isRtl ? -1 : 1))
    bump()
  }, [bump, isRtl, state])

  const handleSpace = useCallback(() => {
    state.goToPage(state.currentPage + 1)
    bump()
  }, [bump, state])

  const handleEscape = useCallback(() => {
    if (shortcutsOpen) {
      setShortcutsOpen(false)
      return
    }
    if (isFullscreen) {
      handleToggleFullscreen()
    }
  }, [handleToggleFullscreen, isFullscreen, shortcutsOpen])

  useReaderShortcuts({
    onArrowLeft: handleArrowLeft,
    onArrowRight: handleArrowRight,
    onSpace: handleSpace,
    onToggleBookmark: handleToggleBookmark,
    onToggleFullscreen: handleToggleFullscreen,
    onCycleTheme: cycleTheme,
    onOpenShortcuts: () => setShortcutsOpen(true),
    onEscape: handleEscape,
    enabled: true,
  })

  const handleScrubberCommit = useCallback(
    (page: number) => {
      // Instant jump on scrubber commit — no slide animation.
      state.goToPage(page, { animated: false })
      bump()
    },
    [bump, state],
  )

  const handleNextPage = useCallback(() => {
    state.goToPage(state.currentPage + 2)
    bump()
  }, [bump, state])

  const handlePrevPage = useCallback(() => {
    state.goToPage(state.currentPage - 2)
    bump()
  }, [bump, state])

  // Spread sizing. The container wraps the side rail + main area; we
  // calculate the spread width from the leftover horizontal space.
  const usableWidth = sideRailOpen ? containerWidth - 300 : containerWidth
  const spreadMax = Math.min(SPREAD_MAX_WIDTH, usableWidth - 64)
  const pageWidth = Math.max(280, Math.floor(spreadMax / 2) - 8)

  const showSecondPage =
    state.totalPages != null && state.currentPage + 1 <= state.totalPages

  const isAtFirst = state.currentPage <= 1
  const isAtLast =
    state.totalPages != null && state.currentPage >= state.totalPages

  // Slide direction for the spread. In RTL, advancing slides in from the
  // right (positive x); LTR mirrors.
  const spreadEnterX = reduceMotion
    ? 0
    : (isRtl ? 1 : -1) * state.pageDirection * 24

  const handleJumpFromRail = useCallback(
    (page: number) => {
      state.goToPage(page, { animated: false })
      bump()
    },
    [bump, state],
  )

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex overflow-hidden"
    >
      <ReaderSideRail
        open={sideRailOpen}
        title={title}
        theme={theme}
        onThemeChange={onThemeChange}
        outlineEntries={outlineEntries}
        bookmarks={state.bookmarks}
        onJump={handleJumpFromRail}
        onUpdateLabel={state.updateBookmarkLabel}
        currentPage={state.currentPage}
        totalPages={state.totalPages}
        isRtl={isRtl}
      />

      <div className="relative flex-1">
        <ReaderTopBar
          variant="desktop"
          visible={visible}
          title={title}
          isRtl={isRtl}
          saveState={state.saveState}
          onClose={handleClose}
          // On desktop, settings live INSIDE the side rail (theme picker,
          // progress ring, bookmarks). The top-bar settings cog opens the
          // rail rather than a separate sheet.
          onOpenSettings={() => setSideRailOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onToggleFullscreen={handleToggleFullscreen}
          onToggleSideRail={() => setSideRailOpen((v) => !v)}
          isFullscreen={isFullscreen}
          showSideRailToggle
        />

        <div className="absolute inset-0 flex items-center justify-center px-8 pb-16 pt-14">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={state.currentPage}
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, x: spreadEnterX }
              }
              animate={{ opacity: 1, x: 0 }}
              exit={
                reduceMotion ? { opacity: 0 } : { opacity: 0, x: -spreadEnterX }
              }
              transition={{ duration: 0.28, ease: EASE_EDITORIAL }}
              className="flex max-w-full items-center justify-center gap-2"
              style={{ maxWidth: spreadMax }}
            >
              {/* Source order: current first, then next. dir="rtl" on the
                  parent puts current on the right (Arabic) automatically. */}
              <div className="rounded-sm bg-[var(--reader-surface-elev)] shadow-xl">
                <Page
                  pageNumber={state.currentPage}
                  width={pageWidth}
                  renderTextLayer
                  renderAnnotationLayer
                  className="bg-[var(--reader-surface-elev)]"
                />
              </div>
              {showSecondPage && (
                <div className="rounded-sm bg-[var(--reader-surface-elev)] shadow-xl">
                  <Page
                    pageNumber={state.currentPage + 1}
                    width={pageWidth}
                    renderTextLayer
                    renderAnnotationLayer
                    className="bg-[var(--reader-surface-elev)]"
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <ReaderBottomBar
          variant="desktop"
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
      </div>

      <ShortcutsOverlay
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        isRtl={isRtl}
      />
    </div>
  )
}
