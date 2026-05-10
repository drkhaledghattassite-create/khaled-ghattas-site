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
 *   Space = next, b = bookmark, f = fullscreen, ? = shortcuts,
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
import { useAutoHideChrome } from '../hooks/useAutoHideChrome'
import { useReaderShortcuts } from '../hooks/useReaderShortcuts'
import { useDownload } from '../hooks/useDownload'
import { ReaderTopBar } from './ReaderTopBar'
import { ReaderBottomBar } from './ReaderBottomBar'
import { ReaderSideRail } from './ReaderSideRail'
import { ShortcutsOverlay } from './ShortcutsOverlay'
import { DownloadDialog } from './DownloadDialog'

const SPREAD_MAX_WIDTH = 1100

export function DesktopReader({
  title,
  isRtl,
  state,
  containerWidth,
  outlineEntries,
  pdfUrl,
  slug,
}: {
  title: string
  isRtl: boolean
  state: UseReaderStateResult
  containerWidth: number
  outlineEntries: ResolvedOutlineEntry[] | null
  pdfUrl: string
  slug: string
}) {
  const reduceMotion = useReducedMotion()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sideRailOpen, setSideRailOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : false,
  )

  const { isDownloading, downloadCurrentPage, downloadPages } = useDownload(
    pdfUrl,
    slug,
  )

  const { visible, bump } = useAutoHideChrome(containerRef, {
    initiallyVisible: true,
    hideMs: 3000,
    forceVisible: shortcutsOpen || downloadDialogOpen,
  })

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
      containerRef.current?.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  const handleToggleBookmark = useCallback(() => {
    void state.toggleBookmark(state.currentPage)
    bump()
  }, [bump, state])

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
    if (downloadDialogOpen) {
      setDownloadDialogOpen(false)
      return
    }
    if (shortcutsOpen) {
      setShortcutsOpen(false)
      return
    }
    if (isFullscreen) {
      handleToggleFullscreen()
    }
  }, [downloadDialogOpen, handleToggleFullscreen, isFullscreen, shortcutsOpen])

  useReaderShortcuts({
    onArrowLeft: handleArrowLeft,
    onArrowRight: handleArrowRight,
    onSpace: handleSpace,
    onToggleBookmark: handleToggleBookmark,
    onToggleFullscreen: handleToggleFullscreen,
    onOpenShortcuts: () => setShortcutsOpen(true),
    onEscape: handleEscape,
    enabled: true,
  })

  const handleScrubberCommit = useCallback(
    (page: number) => {
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

  const usableWidth = sideRailOpen ? containerWidth - 300 : containerWidth
  const spreadMax = Math.min(SPREAD_MAX_WIDTH, usableWidth - 64)
  const pageWidth = Math.max(280, Math.floor(spreadMax / 2) - 8)

  const showSecondPage =
    state.totalPages != null && state.currentPage + 1 <= state.totalPages

  const isAtFirst = state.currentPage <= 1
  const isAtLast =
    state.totalPages != null && state.currentPage >= state.totalPages

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
        outlineEntries={outlineEntries}
        bookmarks={state.bookmarks}
        onJump={handleJumpFromRail}
        onUpdateLabel={state.updateBookmarkLabel}
        onDownloadBookmarkPage={downloadCurrentPage}
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
          onOpenSettings={() => setSideRailOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onToggleFullscreen={handleToggleFullscreen}
          onToggleSideRail={() => setSideRailOpen((v) => !v)}
          onDownloadPage={() => { void downloadCurrentPage(state.currentPage) }}
          onOpenDownloadDialog={() => setDownloadDialogOpen(true)}
          isFullscreen={isFullscreen}
          isDownloading={isDownloading}
          showSideRailToggle
          sideRailOpen={sideRailOpen}
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

      <DownloadDialog
        open={downloadDialogOpen}
        onClose={() => setDownloadDialogOpen(false)}
        onDownload={downloadPages}
        isDownloading={isDownloading}
        currentPage={state.currentPage}
        totalPages={state.totalPages}
        isRtl={isRtl}
      />
    </div>
  )
}
