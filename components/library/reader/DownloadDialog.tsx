'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { EASE_EDITORIAL } from '@/lib/motion/variants'
import { useReducedMotion } from '@/lib/motion/hooks'
import { parsePageInput } from '../lib/extractPages'

/**
 * Multi-page download dialog. Matches ShortcutsOverlay's modal pattern:
 * fixed scrim + centered panel, focus-trapped, Esc-closeable, focus restored
 * on close. Visual chrome uses reader theme tokens throughout.
 */
export function DownloadDialog({
  open,
  onClose,
  onDownload,
  isDownloading,
  currentPage,
  totalPages,
  isRtl,
}: {
  open: boolean
  onClose: () => void
  onDownload: (pages: number[]) => Promise<void>
  isDownloading: boolean
  currentPage: number
  totalPages: number | null
  isRtl: boolean
}) {
  const t = useTranslations('reader.download')
  const reduceMotion = useReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [input, setInput] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setInput(String(currentPage))
      setValidationError(null)
    }
  }, [open, currentPage])

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    const tid = setTimeout(() => closeBtnRef.current?.focus(), 100)
    return () => {
      clearTimeout(tid)
      previousFocusRef.current?.focus?.()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const node = dialogRef.current
      if (!node) return
      const focusables = node.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, textarea',
      )
      if (focusables.length === 0) return
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const total = totalPages ?? 9999
      const { pages, error } = parsePageInput(input, total)
      if (error || pages.length === 0) {
        setValidationError(t('error_invalid'))
        return
      }
      setValidationError(null)
      await onDownload(pages)
      onClose()
    },
    [input, onClose, onDownload, t, totalPages],
  )

  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'
  const fontHead = isRtl ? 'font-arabic-display' : 'font-arabic-display'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE_EDITORIAL }}
            onClick={onClose}
            aria-hidden
            className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            key="dialog"
            ref={dialogRef}
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 8 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 8 }
            }
            transition={{ duration: 0.22, ease: EASE_EDITORIAL }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reader-download-title"
            className="fixed start-1/2 top-1/2 z-[121] w-[calc(100vw-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--reader-border)] bg-[var(--reader-surface-elev)] p-6 [box-shadow:var(--shadow-lift)] rtl:translate-x-1/2"
          >
            <header className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="reader-download-title"
                  className={`m-0 text-[18px] font-bold leading-[1.3] tracking-[-0.005em] text-[var(--reader-fg)] ${fontHead}`}
                >
                  {t('dialog_title')}
                </h2>
                <p
                  className={`mt-1 text-[13px] leading-[1.5] text-[var(--reader-fg-muted)] ${fontBody}`}
                >
                  {t('dialog_subtitle', { total: totalPages ?? '?' })}
                </p>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--reader-fg-muted)] transition-colors hover:bg-[var(--reader-surface)] hover:text-[var(--reader-fg)] focus-visible:bg-[var(--reader-surface)] focus-visible:outline-none"
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
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="reader-page-input"
                  className={`mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--reader-fg-faint)] ${fontBody}`}
                >
                  {t('input_label')}
                </label>
                <input
                  id="reader-page-input"
                  type="text"
                  inputMode="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    setValidationError(null)
                  }}
                  placeholder={t('input_placeholder')}
                  dir="ltr"
                  // text-[16px] prevents iOS Safari from auto-zooming
                  // on focus (any input < 16px triggers a viewport zoom).
                  className={`w-full rounded-[var(--radius-md)] border px-3 py-2.5 text-[16px] text-[var(--reader-fg)] focus:outline-none ${
                    validationError
                      ? 'border-[var(--reader-fg-faint)]'
                      : 'border-[var(--reader-border)] focus:border-[var(--reader-accent)]'
                  } bg-[var(--reader-surface)] ${fontBody}`}
                />
                <p
                  role={validationError ? 'alert' : undefined}
                  className={`mt-1.5 text-[12px] ${
                    validationError
                      ? 'text-[var(--reader-fg-faint)]'
                      : 'text-[var(--reader-fg-faint)]'
                  } ${fontBody}`}
                >
                  {validationError ?? t('input_hint')}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold text-[var(--reader-fg-muted)] transition-colors hover:text-[var(--reader-fg)] ${fontBody}`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isDownloading}
                  className={`flex items-center gap-2 rounded-full bg-[var(--reader-fg)] px-4 py-2 text-[13px] font-semibold text-[var(--reader-surface-elev)] transition-opacity disabled:opacity-60 ${fontBody}`}
                >
                  {isDownloading ? (
                    <>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                        className="animate-spin"
                      >
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      {t('downloading')}
                    </>
                  ) : (
                    t('download_btn')
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
