'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { EASE_EDITORIAL } from '@/lib/motion/variants'
import { useReducedMotion } from '@/lib/motion/hooks'
import type { PdfBookmark } from '@/lib/db/queries'
import { BookmarksList } from './BookmarksList'
import { ProgressRing } from './ProgressRing'
import type { ResolvedOutlineEntry } from '../hooks/useReaderState'

/**
 * Desktop-only collapsible side rail.
 *
 * Top-to-bottom contents:
 *   - Book title
 *   - Progress ring with % + remaining-time estimate
 *   - Table of Contents (when the PDF has a non-empty outline)
 *   - Go to page
 *   - Bookmarks list (with per-row download)
 *
 * Reader theme is driven by the site's light/dark toggle (via PdfReader).
 * No per-reader theme picker; the theme swatches were removed.
 */
export function ReaderSideRail({
  open,
  title,
  outlineEntries,
  bookmarks,
  onJump,
  onUpdateLabel,
  onDownloadBookmarkPage,
  currentPage,
  totalPages,
  isRtl,
}: {
  open: boolean
  title: string
  outlineEntries: ResolvedOutlineEntry[] | null
  bookmarks: PdfBookmark[]
  onJump: (page: number) => void
  onUpdateLabel: (id: string, label: string | null) => void
  onDownloadBookmarkPage?: (page: number) => Promise<void>
  currentPage: number
  totalPages: number | null
  isRtl: boolean
}) {
  const t = useTranslations('reader')
  const reduceMotion = useReducedMotion()
  const [pageInput, setPageInput] = useState(String(currentPage))

  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'
  const fontHead = isRtl ? 'font-arabic-display' : 'font-arabic-display'

  const remainingMinutes =
    totalPages != null ? Math.max(0, (totalPages - currentPage) * 2) : 0
  const remainingHours = Math.round(remainingMinutes / 60)
  const remainingLabel =
    totalPages == null
      ? null
      : remainingMinutes <= 0
      ? t('progress.completed')
      : remainingHours > 0
      ? t('progress.remaining_hours', { hours: remainingHours })
      : t('progress.remaining_minutes', { minutes: remainingMinutes })

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="rail"
          initial={
            reduceMotion ? { opacity: 0, width: 0 } : { x: isRtl ? 320 : -320, width: 0 }
          }
          animate={{ x: 0, width: 300 }}
          exit={
            reduceMotion ? { opacity: 0, width: 0 } : { x: isRtl ? 320 : -320, width: 0 }
          }
          transition={{ duration: 0.32, ease: EASE_EDITORIAL }}
          aria-label={t('aria.side_rail')}
          className="relative z-30 flex h-full shrink-0 flex-col overflow-hidden border-e border-[var(--reader-border)] bg-[var(--reader-surface-elev)]"
        >
          <div className="flex h-full w-[300px] flex-col">
            {/* Header */}
            <header className="border-b border-[var(--reader-border)] px-5 py-4">
              <h2
                className={`m-0 text-[15px] font-bold leading-[1.3] tracking-[-0.005em] text-[var(--reader-fg)] ${fontHead}`}
              >
                {title}
              </h2>
            </header>

            {/*
              data-lenis-prevent: the global Lenis smooth-scroll instance
              intercepts wheel events on the document. Without this attribute
              the rail's inner overflow never receives wheel deltas.
              `overscroll-contain` stops scroll-chain rubber-banding.
            */}
            <div
              data-lenis-prevent
              className="reader-rail-scroll flex-1 overflow-y-auto overscroll-contain"
            >
              {/* Progress ring */}
              <section className="border-b border-[var(--reader-border)] px-5 py-5">
                <ProgressRing
                  currentPage={currentPage}
                  totalPages={totalPages ?? 1}
                  size={88}
                  stroke={6}
                  label={t('progress.title')}
                  remainingLabel={remainingLabel}
                />
              </section>

              {/* ToC — only render the heading when entries exist */}
              {outlineEntries && outlineEntries.length > 0 && (
                <section className="border-b border-[var(--reader-border)] px-5 py-4">
                  <h3
                    className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--reader-fg-faint)] ${fontBody}`}
                  >
                    {t('toc.title')}
                  </h3>
                  <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                    {outlineEntries.map((entry, idx) => (
                      <li key={`${entry.title}-${idx}`}>
                        <button
                          type="button"
                          onClick={() => {
                            if (entry.pageNumber) onJump(entry.pageNumber)
                          }}
                          disabled={entry.pageNumber == null}
                          aria-label={t('toc.go_to_section', { section: entry.title })}
                          className={`block w-full truncate rounded-[var(--radius-sm)] px-2 py-1 text-start text-[13px] text-[var(--reader-fg-muted)] transition-colors hover:bg-[var(--reader-surface)] hover:text-[var(--reader-fg)] disabled:cursor-not-allowed disabled:opacity-50 ${fontBody}`}
                          style={{
                            paddingInlineStart: `${entry.depth * 12 + 8}px`,
                          }}
                        >
                          {entry.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Go to page */}
              <section className="border-b border-[var(--reader-border)] px-5 py-4">
                <h3
                  className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--reader-fg-faint)] ${fontBody}`}
                >
                  {t('settings.go_to_page_label')}
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const n = Number(pageInput)
                    if (Number.isFinite(n)) {
                      onJump(n)
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={totalPages ?? undefined}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    placeholder={t('settings.go_to_page_placeholder')}
                    className={`min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--reader-border)] bg-[var(--reader-surface)] px-2 py-1.5 text-[13px] text-[var(--reader-fg)] focus:border-[var(--reader-accent)] focus:outline-none ${fontBody}`}
                    dir="ltr"
                  />
                  <button
                    type="submit"
                    className={`rounded-full bg-[var(--reader-fg)] px-3 py-1.5 text-[12px] font-semibold text-[var(--reader-surface-elev)] ${fontBody}`}
                  >
                    {t('controls.go')}
                  </button>
                </form>
              </section>

              {/* Bookmarks */}
              <section className="px-5 py-4">
                <h3
                  className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--reader-fg-faint)] ${fontBody}`}
                >
                  {t('bookmarks.title')}
                </h3>
                <BookmarksList
                  bookmarks={bookmarks}
                  onJump={onJump}
                  onUpdateLabel={onUpdateLabel}
                  onDownload={onDownloadBookmarkPage}
                  isRtl={isRtl}
                  variant="list"
                />
              </section>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
