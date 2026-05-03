'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { EASE_EDITORIAL } from '@/lib/motion/variants'
import { useReducedMotion } from '@/lib/motion/hooks'
import type { ReaderTheme } from '../hooks/useReaderTheme'
import type { PdfBookmark } from '@/lib/db/queries'
import { BookmarksList } from './BookmarksList'

/**
 * Mobile settings bottom sheet — slides up from the bottom of the screen.
 * Houses the reader-theme picker, reading info, go-to-page, and a
 * "view bookmarks" tab.
 *
 * The desktop variant of this content lives inside ReaderSideRail (the
 * desktop has more horizontal real estate so settings and bookmarks
 * stack vertically in the rail). This sheet is mobile-only.
 */
export function ReaderSettingsSheet({
  open,
  onClose,
  theme,
  onThemeChange,
  currentPage,
  totalPages,
  onGoToPage,
  bookmarks,
  onBookmarksJump,
  onBookmarksUpdateLabel,
  isRtl,
}: {
  open: boolean
  onClose: () => void
  theme: ReaderTheme
  onThemeChange: (next: ReaderTheme) => void
  currentPage: number
  totalPages: number | null
  onGoToPage: (page: number) => void
  bookmarks: PdfBookmark[]
  onBookmarksJump: (page: number) => void
  onBookmarksUpdateLabel: (bookmarkId: string, label: string | null) => void
  isRtl: boolean
}) {
  const t = useTranslations('reader')
  const reduceMotion = useReducedMotion()
  const [tab, setTab] = useState<'settings' | 'bookmarks'>('settings')
  const [pageInput, setPageInput] = useState(String(currentPage))
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

  useEffect(() => {
    if (open) {
      const tid = setTimeout(() => closeBtnRef.current?.focus(), 80)
      return () => clearTimeout(tid)
    }
  }, [open])

  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  const percent =
    totalPages != null && totalPages > 0
      ? Math.round((currentPage / totalPages) * 100)
      : 0
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
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
            onClick={onClose}
            aria-hidden
            className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            key="sheet"
            initial={
              reduceMotion ? { opacity: 0 } : { y: '100%' }
            }
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            transition={{ duration: 0.32, ease: EASE_EDITORIAL }}
            role="dialog"
            aria-modal="true"
            aria-label={t('aria.settings')}
            className="fixed inset-x-0 bottom-0 z-[121] flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-[var(--reader-border)] bg-[var(--reader-surface-elev)] [box-shadow:var(--shadow-lift)]"
          >
            {/* Drag handle */}
            <div
              aria-hidden
              className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--reader-border-strong)]"
            />
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-3">
              <div className="flex gap-1 rounded-full bg-[var(--reader-surface)] p-1">
                <button
                  type="button"
                  onClick={() => setTab('settings')}
                  aria-pressed={tab === 'settings'}
                  className={`rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors ${
                    tab === 'settings'
                      ? 'bg-[var(--reader-fg)] text-[var(--reader-surface-elev)]'
                      : 'text-[var(--reader-fg-muted)]'
                  } ${fontBody}`}
                >
                  {t('settings.title')}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('bookmarks')}
                  aria-pressed={tab === 'bookmarks'}
                  className={`rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors ${
                    tab === 'bookmarks'
                      ? 'bg-[var(--reader-fg)] text-[var(--reader-surface-elev)]'
                      : 'text-[var(--reader-fg-muted)]'
                  } ${fontBody}`}
                >
                  {t('bookmarks.title')}
                </button>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                aria-label={t('aria.close_settings')}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--reader-fg-muted)] hover:bg-[var(--reader-surface)] hover:text-[var(--reader-fg)] focus-visible:outline-none"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-6">
              {tab === 'settings' ? (
                <div className="flex flex-col gap-6 pt-2">
                  {/* Theme picker */}
                  <section>
                    <h3
                      className={`mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--reader-fg-faint)] ${fontBody}`}
                    >
                      {t('settings.theme_label')}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(['light', 'sepia', 'dark'] as const).map((opt) => (
                        <ThemeSwatch
                          key={opt}
                          value={opt}
                          active={theme === opt}
                          label={t(`theme.${opt}`)}
                          onClick={() => onThemeChange(opt)}
                          fontBody={fontBody}
                        />
                      ))}
                    </div>
                  </section>

                  {/* Reading info */}
                  <section>
                    <h3
                      className={`mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--reader-fg-faint)] ${fontBody}`}
                    >
                      {t('settings.info_label')}
                    </h3>
                    <dl
                      className={`grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] ${fontBody}`}
                    >
                      <InfoRow
                        label={t('settings.current_page')}
                        value={currentPage}
                      />
                      <InfoRow
                        label={t('settings.total_pages')}
                        value={totalPages ?? '—'}
                      />
                      <InfoRow
                        label={t('settings.percent_complete')}
                        value={`${percent}%`}
                      />
                      <InfoRow
                        label={t('settings.time_remaining')}
                        value={remainingLabel ?? '—'}
                      />
                    </dl>
                    <p
                      className={`mt-2 text-[11px] text-[var(--reader-fg-faint)] ${fontBody}`}
                    >
                      {t('settings.minutes_per_page_note')}
                    </p>
                  </section>

                  {/* Go to page */}
                  <section>
                    <h3
                      className={`mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--reader-fg-faint)] ${fontBody}`}
                    >
                      {t('settings.go_to_page_label')}
                    </h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        const n = Number(pageInput)
                        if (Number.isFinite(n)) {
                          onGoToPage(n)
                          onClose()
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
                        className={`min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--reader-border)] bg-[var(--reader-surface)] px-3 py-2 text-[14px] text-[var(--reader-fg)] focus:border-[var(--reader-accent)] focus:outline-none ${fontBody}`}
                        dir="ltr"
                      />
                      <button
                        type="submit"
                        className={`rounded-full bg-[var(--reader-fg)] px-4 py-2 text-[13px] font-semibold text-[var(--reader-surface-elev)] ${fontBody}`}
                      >
                        {t('controls.go')}
                      </button>
                    </form>
                  </section>

                  {/* Switch to bookmarks tab — also reachable via the tab buttons */}
                  <button
                    type="button"
                    onClick={() => setTab('bookmarks')}
                    className={`mt-2 self-start text-[13px] font-semibold text-[var(--reader-accent)] ${fontBody}`}
                  >
                    {t('settings.view_bookmarks')} →
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <BookmarksList
                    bookmarks={bookmarks}
                    onJump={(page) => {
                      onBookmarksJump(page)
                      onClose()
                    }}
                    onUpdateLabel={onBookmarksUpdateLabel}
                    isRtl={isRtl}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ThemeSwatch({
  value,
  active,
  label,
  onClick,
  fontBody,
}: {
  value: 'light' | 'sepia' | 'dark'
  active: boolean
  label: string
  onClick: () => void
  fontBody: string
}) {
  // Inline tints — these MUST match the values added to globals.css under
  // [data-reader-theme="..."] selectors. Keeping them locally as static
  // CSS would require new global classes; inline keeps the swatch source
  // of truth in one component.
  const bg =
    value === 'light'
      ? '#FFFFFF'
      : value === 'sepia'
      ? 'hsl(40, 38%, 94%)'
      : '#171717'
  const fg =
    value === 'light'
      ? '#0A0A0A'
      : value === 'sepia'
      ? 'hsl(30, 30%, 18%)'
      : '#FAFAFA'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex flex-col items-stretch gap-1 rounded-[var(--radius-md)] border-2 p-2 transition-all ${
        active
          ? 'border-[var(--reader-accent)] [box-shadow:var(--shadow-card)]'
          : 'border-[var(--reader-border)]'
      }`}
    >
      <div
        className="flex h-12 items-end justify-end rounded-sm border border-[var(--reader-border)] p-1.5"
        style={{ background: bg }}
      >
        <span
          className="block text-[10px] font-bold leading-none"
          style={{ color: fg }}
        >
          Aa
        </span>
      </div>
      <span
        className={`text-[12px] font-semibold ${
          active
            ? 'text-[var(--reader-accent)]'
            : 'text-[var(--reader-fg-muted)]'
        } ${fontBody}`}
      >
        {label}
      </span>
    </button>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <>
      <dt className="text-[var(--reader-fg-faint)]">{label}</dt>
      <dd
        className="m-0 text-end font-semibold text-[var(--reader-fg)] [font-feature-settings:'tnum']"
        dir="ltr"
      >
        {value}
      </dd>
    </>
  )
}
