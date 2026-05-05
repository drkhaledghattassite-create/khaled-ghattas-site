'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { EASE_EDITORIAL } from '@/lib/motion/variants'
import { useReducedMotion } from '@/lib/motion/hooks'

/**
 * Modal listing keyboard shortcuts. Centred over the reader, scrim
 * behind it, click-outside / Esc to close.
 *
 * Focus management:
 *   - On open: focus moves to the dialog's close button.
 *   - On close: focus returns to whatever element was focused before
 *     open (`previousFocusRef`).
 *   - Tab is constrained to the dialog so it doesn't escape into the
 *     reader chrome behind.
 *
 * The list of shortcuts mirrors useReaderShortcuts.ts. Visual chrome
 * uses the reader's theme tokens so it matches whichever variant
 * (light/sepia/dark) is active.
 */
export function ShortcutsOverlay({
  open,
  onClose,
  isRtl,
}: {
  open: boolean
  onClose: () => void
  isRtl: boolean
}) {
  const t = useTranslations('reader.shortcuts')
  const reduceMotion = useReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Capture the previously focused element on open, restore on close.
  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    // Move focus to the close button after the entry animation lands.
    const tid = setTimeout(() => closeBtnRef.current?.focus(), 100)
    return () => {
      clearTimeout(tid)
      // Restore focus on close.
      previousFocusRef.current?.focus?.()
    }
  }, [open])

  // Trap Tab inside the dialog.
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

  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'
  const fontHead = isRtl ? 'font-arabic-display' : 'font-arabic-display'

  const items = [
    { keys: [isRtl ? '←' : '→', '⎵'], label: t('next_page') },
    { keys: [isRtl ? '→' : '←'], label: t('previous_page') },
    { keys: ['B'], label: t('toggle_bookmark') },
    { keys: ['F'], label: t('toggle_fullscreen') },
    { keys: ['?'], label: t('open_shortcuts') },
    { keys: ['Esc'], label: t('close_overlay') },
  ]

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
            aria-labelledby="reader-shortcuts-title"
            className="fixed start-1/2 top-1/2 z-[121] w-[calc(100vw-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--reader-border)] bg-[var(--reader-surface-elev)] p-6 [box-shadow:var(--shadow-lift)] rtl:translate-x-1/2"
          >
            <header className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="reader-shortcuts-title"
                  className={`m-0 text-[18px] font-bold leading-[1.3] tracking-[-0.005em] text-[var(--reader-fg)] ${fontHead}`}
                >
                  {t('title')}
                </h2>
                <p
                  className={`mt-1 text-[13px] leading-[1.5] text-[var(--reader-fg-muted)] ${fontBody}`}
                >
                  {t('subtitle')}
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
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {items.map((item) => (
                <li
                  key={item.label}
                  className={`flex items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2 py-1.5 ${fontBody}`}
                >
                  <span className="text-[14px] text-[var(--reader-fg)]">
                    {item.label}
                  </span>
                  <span
                    className="flex shrink-0 items-center gap-1"
                    dir="ltr"
                  >
                    {item.keys.map((k, i) => (
                      <span key={i} className="reader-kbd">
                        {k}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
