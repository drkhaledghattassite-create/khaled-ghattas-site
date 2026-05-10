'use client'

import { useEffect, useState } from 'react'

/**
 * Page scrubber — native <input type="range"> styled via CSS in
 * globals.css (`.reader-scrubber`).
 *
 * Behavior:
 *   - dragging (pointer or keyboard) updates a local `previewPage`
 *     without committing to the parent
 *   - on release (pointerup/touchend/mouseup OR keyup) commits the
 *     preview via `onCommit(page)`
 *   - the displayed preview number flashes above the thumb during the
 *     interaction and disappears on release
 *
 * Keyboard model: native `<input type="range">` accepts Arrow keys,
 * Home, End, PageUp, PageDown. Each press fires React's onChange, which
 * updates `previewPage`. We mark `dragging=true` on the first qualifying
 * keydown so the preview banner shows, and commit on keyup so a held
 * key only re-renders the page once when the user releases. Without
 * this, keyboard users could move the thumb but never turn the page —
 * the original implementation only committed on pointer release.
 *
 * RTL note: range inputs do NOT auto-flip in browsers. We keep the
 * track LTR (`direction: ltr` in CSS) — users expect the thumb to move
 * left-to-right with rising numbers regardless of UI direction. The
 * displayed number above is locale-aware (Arabic-Indic via next-intl).
 */

// Native keys that change <input type="range"> value. Filtering by this
// set avoids firing the commit on Tab keyup (which can fire on the
// scrubber if Tab is released after focus lands here).
const RANGE_KEYS = new Set<string>([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
])

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

  // Single commit-and-reset path so pointer + keyboard + blur all fall
  // through identical logic and don't drift over time.
  const commitIfDragging = () => {
    if (dragging) {
      onCommit(previewPage)
      setDragging(false)
    }
  }

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
        onPointerUp={commitIfDragging}
        // Mobile Safari occasionally drops pointerup on touch; fall back
        // to mouseup/touchend so the commit still fires.
        onMouseUp={commitIfDragging}
        onTouchEnd={commitIfDragging}
        // Keyboard path: arrow/Home/End/PageUp/PageDown all change the
        // value natively. Mark dragging on first such keydown so the
        // preview banner appears; commit on keyup so a held key only
        // re-renders the page once at release.
        onKeyDown={(e) => {
          if (RANGE_KEYS.has(e.key) && !dragging) {
            setDragging(true)
          }
        }}
        onKeyUp={(e) => {
          if (RANGE_KEYS.has(e.key)) commitIfDragging()
        }}
        // Defensive: if focus leaves while a keyboard interaction is
        // in flight (e.g. user Tab-aways mid-arrow), commit and reset
        // so the next open of the scrubber starts from a clean state.
        onBlur={commitIfDragging}
      />
    </div>
  )
}
