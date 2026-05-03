'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { EASE_EDITORIAL } from '@/lib/motion/variants'
import { useReducedMotion } from '@/lib/motion/hooks'
import type { ReaderTheme } from '../hooks/useReaderTheme'
import type { PdfBookmark } from '@/lib/db/queries'
import { BookmarksList } from './BookmarksList'
import { ProgressRing } from './ProgressRing'
import type { ResolvedOutlineEntry } from '../hooks/useReaderState'

/**
 * Desktop-only collapsible side rail.
 *
 * Top-to-bottom contents:
 *   - Book title (font-display)
 *   - Theme picker (3 swatches)
 *   - Table of Contents (when the PDF has a non-empty outline)
 *   - Bookmarks list
 *   - Progress ring with % + remaining-time estimate
 *
 * The toggle button outside this component (in DesktopReader) controls
 * the `open` state. We render unmounted at width 0 when closed so the
 * surrounding flexbox reflows the spread accordingly.
 */
export function ReaderSideRail({
  open,
  title,
  theme,
  onThemeChange,
  outlineEntries,
  bookmarks,
  onJump,
  onUpdateLabel,
  currentPage,
  totalPages,
  isRtl,
}: {
  open: boolean
  title: string
  theme: ReaderTheme
  onThemeChange: (next: ReaderTheme) => void
  outlineEntries: ResolvedOutlineEntry[] | null
  bookmarks: PdfBookmark[]
  onJump: (page: number) => void
  onUpdateLabel: (id: string, label: string | null) => void
  currentPage: number
  totalPages: number | null
  isRtl: boolean
}) {
  const t = useTranslations('reader')
  const reduceMotion = useReducedMotion()
  const [pageInput, setPageInput] = useState(String(currentPage))

  // Keep the input in sync with externally-changed currentPage (next/prev,
  // arrow keys, scrubber). The user typing into the field overrides until
  // submit/blur clears, but the next currentPage update wins.
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
              <p
                className={`m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--reader-fg-faint)] ${fontBody}`}
              >
                {title.length > 0 ? '' : ''}
              </p>
              <h2
                className={`m-0 text-[15px] font-bold leading-[1.3] tracking-[-0.005em] text-[var(--reader-fg)] ${fontHead}`}
              >
                {title}
              </h2>
            </header>

            {/*
              data-lenis-prevent: the global Lenis smooth-scroll instance
              (see components/providers/LenisProvider.tsx) intercepts wheel
              events on the document. Without this attribute the rail's
              inner overflow never receives wheel deltas — scrolling
              appears broken even though the content is taller than the
              viewport. Same fix used in components/admin/AdminSidebar.tsx.
              `overscroll-contain` stops scroll-chain rubber-banding from
              propagating to the body when the rail hits its top/bottom.
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

              {/* Theme picker */}
              <section className="border-b border-[var(--reader-border)] px-5 py-4">
                <h3
                  className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--reader-fg-faint)] ${fontBody}`}
                >
                  {t('settings.theme_label')}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['light', 'sepia', 'dark'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onThemeChange(opt)}
                      aria-pressed={theme === opt}
                      title={t(`theme.${opt}`)}
                      className={`group flex h-9 items-center justify-center rounded-[var(--radius-sm)] border-2 transition-all ${
                        theme === opt
                          ? 'border-[var(--reader-accent)]'
                          : 'border-[var(--reader-border)]'
                      }`}
                      style={{
                        background:
                          opt === 'light'
                            ? '#FFFFFF'
                            : opt === 'sepia'
                            ? 'hsl(40, 38%, 94%)'
                            : '#171717',
                      }}
                    >
                      <span
                        className="text-[10px] font-bold"
                        style={{
                          color:
                            opt === 'light'
                              ? '#0A0A0A'
                              : opt === 'sepia'
                              ? 'hsl(30, 30%, 18%)'
                              : '#FAFAFA',
                        }}
                      >
                        Aa
                      </span>
                    </button>
                  ))}
                </div>
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
