'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'motion/react'
import { EASE_EDITORIAL } from '@/lib/motion/variants'
import type { PdfBookmark } from '@/lib/db/queries'

/**
 * Renders the user's bookmarks as a vertical list. Each row:
 *   - "Page N" label (locale-aware via t())
 *   - optional note (plain text)
 *   - click → jumps to page (closes overlay if applicable)
 *   - inline edit on the note (tap to edit, blur or Enter to save)
 *
 * Reused by both the mobile settings sheet (showing all bookmarks for the
 * book) and the desktop side rail. Visual chrome is theme-aware via the
 * --reader-* tokens.
 */
export function BookmarksList({
  bookmarks,
  onJump,
  onUpdateLabel,
  onDownload,
  isRtl,
  variant = 'list',
}: {
  bookmarks: PdfBookmark[]
  onJump: (page: number) => void
  onUpdateLabel: (bookmarkId: string, label: string | null) => void
  onDownload?: (page: number) => Promise<void>
  isRtl: boolean
  variant?: 'list' | 'compact'
}) {
  const t = useTranslations('reader.bookmarks')
  const tDownload = useTranslations('reader.download')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState('')

  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  if (bookmarks.length === 0) {
    return (
      <p
        className={`m-0 px-1 py-2 text-[13px] leading-[1.6] text-[var(--reader-fg-faint)] ${fontBody}`}
      >
        {t('empty')}
      </p>
    )
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      <AnimatePresence initial={false}>
        {bookmarks.map((b) => {
          const isEditing = editingId === b.id
          return (
            <motion.li
              key={b.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
              className="overflow-hidden"
            >
              <button
                type="button"
                onClick={() => onJump(b.pageNumber)}
                aria-label={t('jump_to', { page: b.pageNumber })}
                className={`group flex w-full items-start gap-3 rounded-[var(--radius-sm)] border border-transparent px-2 py-2 text-start transition-colors hover:border-[var(--reader-border)] hover:bg-[var(--reader-surface-elev)] focus-visible:border-[var(--reader-border)] focus-visible:bg-[var(--reader-surface-elev)] focus-visible:outline-none ${fontBody}`}
              >
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-5 min-w-[2.25rem] shrink-0 items-center justify-center rounded-sm bg-[var(--reader-accent-fg)]/10 px-1.5 text-[11px] font-semibold tabular-nums text-[var(--reader-accent)]"
                  dir="ltr"
                >
                  {b.pageNumber}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className={`truncate text-[13px] font-semibold text-[var(--reader-fg)] ${fontBody}`}
                  >
                    {t('page_label', { page: b.pageNumber })}
                  </span>
                  {b.label && !isEditing && (
                    <span
                      className={`truncate text-[12px] text-[var(--reader-fg-muted)] ${fontBody}`}
                    >
                      {b.label}
                    </span>
                  )}
                </span>
              </button>
              {variant === 'list' && (
                <div className="ms-[2.75rem] mt-1 flex items-center gap-2">
                  {isEditing ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        onUpdateLabel(b.id, draftLabel.trim() || null)
                        setEditingId(null)
                      }}
                      className="flex w-full items-center gap-2"
                      data-reader-no-tap
                    >
                      <input
                        type="text"
                        value={draftLabel}
                        onChange={(e) => setDraftLabel(e.target.value)}
                        onBlur={() => {
                          onUpdateLabel(b.id, draftLabel.trim() || null)
                          setEditingId(null)
                        }}
                        autoFocus
                        maxLength={280}
                        placeholder={t('label_placeholder')}
                        className={`min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--reader-border)] bg-[var(--reader-surface-elev)] px-2 py-1 text-[12px] text-[var(--reader-fg)] focus:border-[var(--reader-accent)] focus:outline-none ${fontBody}`}
                      />
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(b.id)
                          setDraftLabel(b.label ?? '')
                        }}
                        className={`text-[11px] text-[var(--reader-fg-faint)] hover:text-[var(--reader-fg-muted)] ${fontBody}`}
                      >
                        {b.label ? '…' : t('label_placeholder')}
                      </button>
                      {onDownload && (
                        <button
                          type="button"
                          onClick={() => { void onDownload(b.pageNumber) }}
                          aria-label={tDownload('bookmark_page_aria')}
                          className="ms-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--reader-fg-faint)] transition-colors hover:text-[var(--reader-fg)]"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M10 3v10M6 9l4 4 4-4M4 17h12" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
