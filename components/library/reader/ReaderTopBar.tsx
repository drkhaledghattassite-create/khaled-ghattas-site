'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { EASE_EDITORIAL } from '@/lib/motion/variants'
import { useReducedMotion } from '@/lib/motion/hooks'
import type { SaveState } from '../hooks/useReaderState'

/**
 * Top bar — close button (RTL leading), centered title, settings + extras
 * (RTL trailing). Mobile and desktop share the same component but vary in
 * height and which extras render.
 *
 * The save indicator (saving / saved pill) appears next to the title on
 * desktop only — on mobile we omit it; the toast on resume + the eventual
 * unmount flush keep the user covered without crowding the slim bar.
 */
export function ReaderTopBar({
  variant,
  visible,
  title,
  isRtl,
  saveState,
  onClose,
  onOpenSettings,
  onToggleFullscreen,
  onOpenShortcuts,
  onToggleSideRail,
  onDownloadPage,
  onOpenDownloadDialog,
  isFullscreen,
  isDownloading,
  showSideRailToggle,
}: {
  variant: 'mobile' | 'desktop'
  visible: boolean
  title: string
  isRtl: boolean
  saveState: SaveState
  onClose: () => void
  onOpenSettings: () => void
  onToggleFullscreen?: () => void
  onOpenShortcuts?: () => void
  onToggleSideRail?: () => void
  onDownloadPage?: () => void
  onOpenDownloadDialog?: () => void
  isFullscreen?: boolean
  isDownloading?: boolean
  showSideRailToggle?: boolean
}) {
  const t = useTranslations('reader')
  const reduceMotion = useReducedMotion()

  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'
  const fontHead = isRtl ? 'font-arabic-display' : 'font-arabic-display'

  const height = variant === 'mobile' ? 'h-14' : 'h-12'
  const px = variant === 'mobile' ? 'px-3' : 'px-4'
  const titleSize =
    variant === 'mobile'
      ? 'text-[15px]'
      : 'text-[14px]'

  return (
    <motion.header
      initial={false}
      animate={
        reduceMotion
          ? { opacity: visible ? 1 : 0 }
          : { opacity: visible ? 1 : 0, y: visible ? 0 : -8 }
      }
      transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
      role="toolbar"
      aria-label={t('aria.top_bar')}
      // `absolute` (not `fixed`) so the desktop layout's side rail isn't
      // overlapped — the bars are scoped to their nearest positioned
      // ancestor (the right column on desktop, the full reader root on
      // mobile). Both reader variants wrap their main area in a
      // position:relative/absolute container, so this works in both.
      className={`absolute inset-x-0 top-0 z-40 flex ${height} items-center gap-2 border-b border-[var(--reader-border)] bg-[var(--reader-chrome)] ${px} backdrop-blur-md backdrop-saturate-[1.2] supports-[backdrop-filter]:bg-[var(--reader-chrome)] ${
        visible ? '' : 'pointer-events-none'
      }`}
    >
      {/* Side rail toggle — desktop only, RTL leading */}
      {showSideRailToggle && onToggleSideRail && (
        <IconButton
          onClick={onToggleSideRail}
          ariaLabel={t('side_rail.open')}
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
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </IconButton>
      )}

      {/* Close — RTL leading */}
      <IconButton onClick={onClose} ariaLabel={t('controls.close')}>
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
          <path d={isRtl ? 'M7 4l6 6-6 6' : 'M13 4l-6 6 6 6'} />
        </svg>
      </IconButton>

      {/* Title */}
      <h1
        className={`m-0 min-w-0 flex-1 truncate text-center ${titleSize} font-bold leading-tight text-[var(--reader-fg)] ${fontHead}`}
      >
        {title}
      </h1>

      {/* Save indicator — desktop only */}
      {variant === 'desktop' && saveState !== 'idle' && (
        <span
          role="status"
          aria-live="polite"
          className={`hidden items-center gap-1.5 text-[12px] text-[var(--reader-fg-faint)] md:inline-flex ${fontBody}`}
        >
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              saveState === 'saving'
                ? 'animate-pulse bg-[var(--reader-fg-faint)]'
                : 'bg-[var(--reader-accent)]'
            }`}
          />
          {saveState === 'saving' ? t('controls.saving') : t('controls.saved')}
        </span>
      )}

      {/* Trailing — desktop has fullscreen + shortcuts; both have settings */}
      {variant === 'desktop' && onOpenShortcuts && (
        <IconButton
          onClick={onOpenShortcuts}
          ariaLabel={t('aria.shortcuts')}
        >
          <span
            aria-hidden
            className="text-[15px] font-semibold leading-none"
          >
            ?
          </span>
        </IconButton>
      )}

      {variant === 'desktop' && onToggleFullscreen && (
        <IconButton
          onClick={onToggleFullscreen}
          ariaLabel={
            isFullscreen
              ? t('aria.fullscreen_exit')
              : t('aria.fullscreen_enter')
          }
        >
          {isFullscreen ? (
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
              <path d="M4 8h4V4M16 8h-4V4M4 12h4v4M16 12h-4v4" />
            </svg>
          ) : (
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
              <path d="M4 8V4h4M16 8V4h-4M4 12v4h4M16 12v4h-4" />
            </svg>
          )}
        </IconButton>
      )}

      {/* Download — desktop only: single-page direct + multi-page dialog */}
      {variant === 'desktop' && onDownloadPage && (
        <IconButton
          onClick={onDownloadPage}
          ariaLabel={t('download.current_page_aria')}
          disabled={isDownloading}
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
            <path d="M10 3v10M6 9l4 4 4-4" />
            <path d="M4 17h12" />
          </svg>
        </IconButton>
      )}

      {variant === 'desktop' && onOpenDownloadDialog && (
        <IconButton
          onClick={onOpenDownloadDialog}
          ariaLabel={t('download.multi_page_aria')}
          disabled={isDownloading}
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
            <path d="M7 2h9v14H7z" />
            <path d="M4 5H5M4 8H5M4 11H5" />
            <path d="M11 6v6M8.5 9.5l2.5 2.5 2.5-2.5" />
          </svg>
        </IconButton>
      )}

      {/* Settings — mobile only. On desktop the side rail toggle (hamburger)
          already handles everything the settings sheet contained. */}
      {variant === 'mobile' && (
        <IconButton
          onClick={onOpenSettings}
          ariaLabel={t('aria.open_settings')}
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
            <circle cx="10" cy="10" r="2.5" />
            <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5 5l1.5 1.5M13.5 13.5L15 15M5 15l1.5-1.5M13.5 6.5L15 5" />
          </svg>
        </IconButton>
      )}
    </motion.header>
  )
}

function IconButton({
  onClick,
  ariaLabel,
  disabled,
  children,
}: {
  onClick: () => void
  ariaLabel: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--reader-fg-muted)] transition-colors hover:bg-[var(--reader-surface)] hover:text-[var(--reader-fg)] focus-visible:bg-[var(--reader-surface)] focus-visible:outline-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}
