'use client'

import { useEffect, useState } from 'react'

/**
 * Page scrubber — native <input type="range"> styled via CSS in
 * globals.css (`.reader-scrubber`).
 *
 * Behavior:
 *   - dragging updates a local `previewPage` (not committed)
 *   - on release (pointerup/touchend/mouseup), commits the preview to
 *     the parent via `onCommit(page)`
 *   - the displayed preview number flashes above the thumb during the
 *     drag and disappears on release
 *
 * RTL note: range inputs do NOT auto-flip in browsers. We keep the
 * track LTR (`direction: ltr` in CSS) — users expect the thumb to move
 * left-to-right with rising numbers regardless of UI direction. The
 * displayed number above is locale-aware (Arabic-Indic via next-intl).
 */
export function PageScrubber({
  totalPages,
  currentPage,
  onCommit,
  ariaLabel,
}: {
  totalPages: number
  currentPage: number
  onCommit: (page: number) => void
  ariaLabel: string
}) {
  const [dragging, setDragging] = useState(false)
  const [previewPage, setPreviewPage] = useState(currentPage)

  // When parent currentPage changes externally (next/prev click), keep the
  // scrubber thumb in sync — but only when not actively dragging, otherwise
  // we'd snap the thumb out from under the user's finger.
  useEffect(() => {
    if (!dragging) setPreviewPage(currentPage)
  }, [currentPage, dragging])

  const value = dragging ? previewPage : currentPage

  return (
    <div className="relative w-full">
      {dragging && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-7 start-0 end-0 flex justify-center"
        >
          <span
            className="rounded-md bg-[var(--reader-fg)] px-2 py-0.5 text-[12px] font-semibold text-[var(--reader-surface-elev)] [font-feature-settings:'tnum']"
            dir="ltr"
          >
            {previewPage}
            <span className="opacity-60"> / {totalPages}</span>
          </span>
        </div>
      )}
      <input
        type="range"
        className="reader-scrubber"
        min={1}
        max={Math.max(1, totalPages)}
        step={1}
        value={value}
        aria-label={ariaLabel}
        aria-valuemin={1}
        aria-valuemax={totalPages}
        aria-valuenow={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) setPreviewPage(n)
        }}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => {
          if (dragging) {
            onCommit(previewPage)
            setDragging(false)
          }
        }}
        // Mobile Safari occasionally drops pointerup on touch; fall back
        // to mouseup/touchend so the commit still fires.
        onMouseUp={() => {
          if (dragging) {
            onCommit(previewPage)
            setDragging(false)
          }
        }}
        onTouchEnd={() => {
          if (dragging) {
            onCommit(previewPage)
            setDragging(false)
          }
        }}
      />
    </div>
  )
}
