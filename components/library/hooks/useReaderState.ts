'use client'

/**
 * useReaderState — single source of truth for reader-wide state.
 *
 * Both MobileReader and DesktopReader call this hook to get:
 *   - currentPage, totalPages, goToPage()
 *   - bookmarks list + toggleBookmark() + updateLabel()
 *   - PDF outline (table of contents)
 *   - progress save state ('idle' | 'saving' | 'saved') with debounced
 *     server-action save AND keepalive-fetch unmount flush.
 *
 * The keepalive-fetch unmount flush is preserved verbatim from the
 * legacy reader. The server-action path was being cancelled by the
 * browser on tab close; the route handler /api/reader/progress mirrors
 * the action and is callable with `keepalive: true`. The cleanup uses
 * a ref mirror of currentPage so the closure attached at mount can read
 * the latest page on tear-down (depending on the live state would re-
 * attach the cleanup on every page change and double-flush).
 *
 * Bookmarks layer over a server action with optimistic local updates —
 * the UI reflects the toggle immediately and the server response only
 * matters for the final list shape (which we accept as authoritative
 * if it differs).
 */

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  saveProgressAction,
  toggleBookmarkAction,
  updateBookmarkLabelAction,
} from '@/app/[locale]/(dashboard)/dashboard/library/read/[bookId]/actions'
import type { PdfBookmark } from '@/lib/db/queries'

// PDF.js outline node shape — react-pdf re-exports the same structure that
// pdfjs-dist returns. We don't bind to the lib's TS type directly because
// importing pdfjs-dist types in a module that isn't dynamically loaded
// pulls the worker module into the server build (the same crash that made
// PdfReaderClient necessary). Mirroring the minimal shape here keeps the
// hook server-bundle-safe.
export type PdfOutlineNode = {
  title: string
  // pdfjs returns either a string dest (named destination) or a structured
  // dest (array). We don't try to resolve the page here — that requires
  // an async pdf.getPageIndex() call. The orchestrator handles resolution.
  dest?: string | unknown[] | null
  url?: string | null
  items?: PdfOutlineNode[]
}

export type SaveState = 'idle' | 'saving' | 'saved'

export type ResolvedOutlineEntry = {
  title: string
  pageNumber: number | null
  depth: number
  // children appear flat; depth is the indentation level.
}

const DEBOUNCE_MS = 1500
const SAVED_INDICATOR_MS = 1500
// Throttle the "Saved" pulse to at most once per minute so a long
// reading session doesn't spam the indicator.
const SAVED_PULSE_INTERVAL_MS = 60_000

export type UseReaderStateInput = {
  bookId: string
  initialPage: number
  initialBookmarks: PdfBookmark[]
}

export type UseReaderStateResult = {
  currentPage: number
  totalPages: number | null
  setTotalPages: (n: number) => void
  goToPage: (next: number, opts?: { animated?: boolean }) => void
  // Direction relative to the previous page. 1 = forward (toward end),
  // -1 = backward (toward start). 0 = first render. Used by page-turn
  // animators to know which way to slide.
  pageDirection: 0 | 1 | -1
  // For animated transitions where caller wants to reset direction
  // (e.g. after a scrubber jump that should NOT animate).
  setAnimatedNextChange: (animated: boolean) => void
  bookmarks: PdfBookmark[]
  isPageBookmarked: (page: number) => boolean
  bookmarkOnPage: (page: number) => PdfBookmark | undefined
  toggleBookmark: (page: number, label?: string | null) => Promise<void>
  updateBookmarkLabel: (bookmarkId: string, label: string | null) => Promise<void>
  saveState: SaveState
  outline: PdfOutlineNode[] | null
  setOutline: (raw: PdfOutlineNode[] | null) => void
}

export function useReaderState({
  bookId,
  initialPage,
  initialBookmarks,
}: UseReaderStateInput): UseReaderStateResult {
  const t = useTranslations('reader')

  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPagesState] = useState<number | null>(null)
  const [pageDirection, setPageDirection] = useState<0 | 1 | -1>(0)
  const [bookmarks, setBookmarks] = useState<PdfBookmark[]>(initialBookmarks)
  const [outline, setOutline] = useState<PdfOutlineNode[] | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  // Whether the next page change should animate. Default true; scrubber
  // commits override to false for "instant" jumps.
  const animatedNextChangeRef = useRef(true)

  const [, startSaveTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedPageRef = useRef<number>(initialPage)
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedPulseAtRef = useRef<number>(0)
  // Mirror of currentPage for the unmount cleanup (see [bookId]-deps note
  // below). Without this mirror, the cleanup closure captures the page
  // from first render forever and overwrites a freshly-saved later page
  // with initialPage on unmount.
  const currentPageRef = useRef(currentPage)
  // Same mirror trick for totalPages: the cleanup closure attaches at
  // mount when totalPages is still null; without this ref the keepalive
  // flush would always omit the count. The debounced save effect also
  // reads through the ref so an early page change doesn't lock in a
  // stale (or missing) total.
  const totalPagesRef = useRef<number | null>(null)

  // Resume toast — fire ONCE on mount when restoring above page 1. Empty
  // deps are intentional; including initialPage would re-fire on every
  // parent rerender that happens to change it.
  useEffect(() => {
    if (initialPage > 1) {
      // id deduplicates the toast when React Strict Mode double-invokes this effect in dev
      toast(t('resume.toast', { page: initialPage }), { id: 'reader-resume' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the unmount-cleanup mirror in sync with the latest page.
  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  // Keep totalPagesRef in sync once the document load resolves it.
  useEffect(() => {
    totalPagesRef.current = totalPages
  }, [totalPages])

  const setTotalPages = useCallback((n: number) => {
    setTotalPagesState(n)
    // Clamp initial page in case it was out of range for this PDF.
    setCurrentPage((p) => Math.max(1, Math.min(n, p)))
  }, [])

  const goToPage = useCallback(
    (next: number, opts?: { animated?: boolean }) => {
      setTotalPagesState((tp) => {
        if (tp == null) return tp
        const clamped = Math.max(1, Math.min(tp, Math.floor(next)))
        setCurrentPage((prev) => {
          if (clamped === prev) return prev
          setPageDirection(clamped > prev ? 1 : -1)
          return clamped
        })
        animatedNextChangeRef.current = opts?.animated ?? true
        return tp
      })
    },
    [],
  )

  const setAnimatedNextChange = useCallback((animated: boolean) => {
    animatedNextChangeRef.current = animated
  }, [])

  // Debounced save on page change. The first effect run (matching
  // initialPage) is skipped via lastSavedPageRef.
  useEffect(() => {
    if (currentPage === lastSavedPageRef.current) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const targetPage = currentPage
      // Read totalPages through the ref so we send the latest known total
      // even if the document only finished loading after the page change
      // that triggered this save.
      const targetTotal = totalPagesRef.current ?? undefined
      setSaveState('saving')
      startSaveTransition(async () => {
        const res = await saveProgressAction({
          bookId,
          page: targetPage,
          totalPages: targetTotal,
        })
        if (res.ok) {
          lastSavedPageRef.current = targetPage
          // Throttle the visible "saved" pulse so it doesn't spam during
          // a fast page-flipping session. We always update the ref so the
          // unmount flush knows the page is persisted.
          const now = Date.now()
          if (now - lastSavedPulseAtRef.current >= SAVED_PULSE_INTERVAL_MS) {
            lastSavedPulseAtRef.current = now
            setSaveState('saved')
            if (savedFlashTimerRef.current) {
              clearTimeout(savedFlashTimerRef.current)
            }
            savedFlashTimerRef.current = setTimeout(
              () => setSaveState('idle'),
              SAVED_INDICATOR_MS,
            )
          } else {
            setSaveState('idle')
          }
        } else {
          // Silent degrade — log only. The user keeps reading.
          setSaveState('idle')
        }
      })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [bookId, currentPage])

  // Unmount flush + pagehide listener — keepalive fetch save of the
  // latest page if it hasn't been persisted yet. See architecture note
  // at the top of this file.
  useEffect(() => {
    const flush = () => {
      const finalPage = currentPageRef.current
      if (finalPage === lastSavedPageRef.current) return
      const finalTotal = totalPagesRef.current
      try {
        // keepalive: true survives tab-close and pagehide; server actions
        // do not. The route handler is idempotent (onConflictDoUpdate) so
        // a duplicate write from React's unmount + pagehide is fine.
        // totalPages is omitted when the document never finished loading
        // (rare); the server preserves any prior value in that case.
        fetch('/api/reader/progress', {
          method: 'POST',
          keepalive: true,
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            finalTotal != null
              ? { bookId, page: finalPage, totalPages: finalTotal }
              : { bookId, page: finalPage },
          ),
        }).catch(() => {
          // Unmount path: nowhere to surface the failure.
        })
      } catch {
        // Never throw from a cleanup or unload handler.
      }
    }

    const onPageHide = () => flush()
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', onPageHide)
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current)
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', onPageHide)
      }
      flush()
    }
  }, [bookId])

  // ─── Bookmarks ───────────────────────────────────────────────────────

  const isPageBookmarked = useCallback(
    (page: number) => bookmarks.some((b) => b.pageNumber === page),
    [bookmarks],
  )

  const bookmarkOnPage = useCallback(
    (page: number) => bookmarks.find((b) => b.pageNumber === page),
    [bookmarks],
  )

  const toggleBookmarkLocal = useCallback(
    async (page: number, label?: string | null) => {
      // Optimistic update — flip immediately and reconcile after the
      // server responds. The reconciliation only matters if the server
      // says "ok: false" (auth lost, ownership lost, DB error).
      const existing = bookmarks.find((b) => b.pageNumber === page)
      let optimisticList: PdfBookmark[]
      if (existing) {
        optimisticList = bookmarks.filter((b) => b.id !== existing.id)
      } else {
        const optimistic: PdfBookmark = {
          id: `optimistic-${page}-${Date.now()}`,
          userId: 'optimistic',
          bookId,
          pageNumber: page,
          label: label ?? null,
          createdAt: new Date(),
        }
        optimisticList = [...bookmarks, optimistic].sort(
          (a, b) => a.pageNumber - b.pageNumber,
        )
      }
      setBookmarks(optimisticList)

      // Haptic on the toggle — feature-detected, no-op silently if absent.
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(10)
        } catch {
          // Silent — vibrate may be blocked by user prefs.
        }
      }

      const result = await toggleBookmarkAction({
        bookId,
        pageNumber: page,
        label: label ?? null,
      })

      if (!result.ok) {
        // Revert. Toast omitted: the user's tap was either too fast for
        // the request or the migration isn't applied — both are silent
        // degrades by design.
        setBookmarks(bookmarks)
        return
      }

      if (result.bookmark) {
        // Server says "added". Replace the optimistic placeholder.
        setBookmarks((curr) => {
          const withoutOptimistic = curr.filter((b) => b.pageNumber !== page)
          return [...withoutOptimistic, result.bookmark!].sort(
            (a, b) => a.pageNumber - b.pageNumber,
          )
        })
        toast(t('bookmarks.added_toast', { page }))
      } else {
        // Server says "removed". Optimistic list already has it removed.
        toast(t('bookmarks.removed_toast', { page }))
      }
    },
    [bookmarks, bookId, t],
  )

  const updateBookmarkLabelLocal = useCallback(
    async (bookmarkId: string, label: string | null) => {
      // Optimistic — patch the label in place.
      const previous = bookmarks
      setBookmarks((curr) =>
        curr.map((b) => (b.id === bookmarkId ? { ...b, label } : b)),
      )
      const res = await updateBookmarkLabelAction({ bookmarkId, label })
      if (!res.ok) {
        // Revert on failure. Optimistic id (e.g. "optimistic-...") will be
        // skipped by the server (not a UUID) but we still need to keep the
        // local list consistent with the in-memory mock store on the next
        // refresh — the simplest correct behavior is to revert.
        setBookmarks(previous)
      } else if (res.bookmark) {
        setBookmarks((curr) =>
          curr.map((b) => (b.id === res.bookmark!.id ? res.bookmark! : b)),
        )
      }
    },
    [bookmarks],
  )

  const result = useMemo<UseReaderStateResult>(
    () => ({
      currentPage,
      totalPages,
      setTotalPages,
      goToPage,
      pageDirection,
      setAnimatedNextChange,
      bookmarks,
      isPageBookmarked,
      bookmarkOnPage,
      toggleBookmark: toggleBookmarkLocal,
      updateBookmarkLabel: updateBookmarkLabelLocal,
      saveState,
      outline,
      setOutline,
    }),
    [
      currentPage,
      totalPages,
      setTotalPages,
      goToPage,
      pageDirection,
      setAnimatedNextChange,
      bookmarks,
      isPageBookmarked,
      bookmarkOnPage,
      toggleBookmarkLocal,
      updateBookmarkLabelLocal,
      saveState,
      outline,
    ],
  )

  return result
}
