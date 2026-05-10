'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { EASE_EDITORIAL } from '@/lib/motion/variants'
import { useReducedMotion } from '@/lib/motion/hooks'
import { PageScrubber } from './PageScrubber'

/**
 * Bottom bar.
 *
 * Mobile (h-16):
 *   - bookmark toggle (RTL leading)
 *   - "Page X of Y" (centre)
 *   - empty (RTL trailing)
 *   - PageScrubber row underneath
 *
 * Desktop (h-12):
 *   - prev / next buttons + page indicator
 *   - the scrubber sits above the bar in a thin track when totalPages > 0
 */
export function ReaderBottomBar({
  variant,
  visible,
  currentPage,
  totalPages,
  isRtl,
  isPageBookmarked,
  onToggleBookmark,
  onScrubberCommit,
  onPrevPage,
  onNextPage,
  isAtFirst,
  isAtLast,
}: {
  variant: 'mobile' | 'desktop'
  visible: boolean
  currentPage: number
  totalPages: number | null
  isRtl: boolean
  isPageBookmarked: boolean
  onToggleBookmark: () => void
  onScrubberCommit: (page: number) => void
  onPrevPage?: () => void
  onNextPage?: () => void
  isAtFirst?: boolean
  isAtLast?: boolean
}) {
  const t = useTranslations('reader')
  const reduceMotion = useReducedMotion()

  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  return (
    <motion.div
      initial={false}
      animate={
        reduceMotion
          ? { opacity: visible ? 1 : 0 }
          : { opacity: visible ? 1 : 0, y: visible ? 0 : 8 }
      }
      transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
      role="toolbar"
      aria-label={t('aria.bottom_bar')}
      // `absolute` (not `fixed`) so the desktop layout's side rail isn't
      // overlapped — see the same note in ReaderTopBar.
      className={`absolute inset-x-0 bottom-0 z-40 border-t border-[var(--reader-border)] bg-[var(--reader-chrome)] backdrop-blur-md backdrop-saturate-[1.2] supports-[backdrop-filter]:bg-[var(--reader-chrome)] ${
        visible ? '' : 'pointer-events-none'
      }`}
    >
      {variant === 'mobile' ? (
        <div className="flex flex-col gap-2 px-4 pb-3 pt-2">
          {/* Top row: bookmark | [prev | indicator | next] | spacer.
              The spacer matches the bookmark's footprint so the centred
              cluster stays optically centred. Prev/next are needed for
              keyboard / switch-control users — swipe-only nav makes the
              book unreadable on a Bluetooth keyboard. Visual treatment
              (h-10 w-10 rounded-full, fg-muted with hover-fg) matches
              the bookmark button so the bar reads as one toolset. */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onToggleBookmark}
              disabled={totalPages == null}
              aria-pressed={isPageBookmarked}
              aria-label={
                isPageBookmarked
                  ? t('bookmarks.remove')
                  : t('bookmarks.add')
              }
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--reader-fg-muted)] transition-colors hover:bg-[var(--reader-surface)] hover:text-[var(--reader-fg)] disabled:opacity-40"
            >
              <BookmarkIcon filled={isPageBookmarked} />
            </button>
            <div className="flex items-center gap-1">
              {onPrevPage && (
                <button
                  type="button"
                  onClick={onPrevPage}
                  disabled={isAtFirst}
                  aria-label={t('controls.previous')}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--reader-fg-muted)] transition-colors hover:bg-[var(--reader-surface)] hover:text-[var(--reader-fg)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowIcon direction={isRtl ? 'right' : 'left'} />
                </button>
              )}
              <span
                className={`text-center text-[13px] font-semibold text-[var(--reader-fg)] [font-feature-settings:'tnum'] ${fontBody}`}
                dir="ltr"
                aria-label={t('aria.current_page_indicator')}
              >
                {t('controls.page_x_of_y', {
                  current: currentPage,
                  total: totalPages ?? '—',
                })}
              </span>
              {onNextPage && (
                <button
                  type="button"
                  onClick={onNextPage}
                  disabled={isAtLast}
                  aria-label={t('controls.next')}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--reader-fg-muted)] transition-colors hover:bg-[var(--reader-surface)] hover:text-[var(--reader-fg)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowIcon direction={isRtl ? 'left' : 'right'} />
                </button>
              )}
            </div>
            <span aria-hidden className="h-10 w-10 shrink-0" />
          </div>

          {/* Scrubber */}
          {totalPages != null && totalPages > 1 && (
            <div className="px-1" data-reader-no-tap>
              <PageScrubber
                totalPages={totalPages}
                currentPage={currentPage}
                onCommit={onScrubberCommit}
                ariaLabel={t('aria.scrubber')}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-12 items-center gap-3 px-4">
          <button
            type="button"
            onClick={onPrevPage}
            disabled={isAtFirst}
            aria-label={t('controls.previous')}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--reader-fg-muted)] transition-colors hover:bg-[var(--reader-surface)] hover:text-[var(--reader-fg)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowIcon direction={isRtl ? 'right' : 'left'} />
          </button>
          <button
            type="button"
            onClick={onToggleBookmark}
            disabled={totalPages == null}
            aria-pressed={isPageBookmarked}
            aria-label={
              isPageBookmarked ? t('bookmarks.remove') : t('bookmarks.add')
            }
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--reader-fg-muted)] transition-colors hover:bg-[var(--reader-surface)] hover:text-[var(--reader-fg)] disabled:opacity-40"
          >
            <BookmarkIcon filled={isPageBookmarked} />
          </button>
          {totalPages != null && totalPages > 1 && (
            <div className="min-w-0 flex-1" data-reader-no-tap>
              <PageScrubber
                totalPages={totalPages}
                currentPage={currentPage}
                onCommit={onScrubberCommit}
                ariaLabel={t('aria.scrubber')}
              />
            </div>
          )}
          <span
            className={`shrink-0 text-[13px] font-semibold text-[var(--reader-fg)] [font-feature-settings:'tnum'] ${fontBody}`}
            dir="ltr"
            aria-label={t('aria.current_page_indicator')}
          >
            {t('controls.page_x_of_y', {
              current: currentPage,
              total: totalPages ?? '—',
            })}
          </span>
          <button
            type="button"
            onClick={onNextPage}
            disabled={isAtLast}
            aria-label={t('controls.next')}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--reader-fg-muted)] transition-colors hover:bg-[var(--reader-surface)] hover:text-[var(--reader-fg)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowIcon direction={isRtl ? 'left' : 'right'} />
          </button>
        </div>
      )}
    </motion.div>
  )
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
        className="text-[var(--reader-accent)]"
      >
        <path d="M5 3a1 1 0 0 0-1 1v13.5a.5.5 0 0 0 .8.4L10 14l5.2 3.9a.5.5 0 0 0 .8-.4V4a1 1 0 0 0-1-1H5z" />
      </svg>
    )
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 3h10v15l-5-3.5L5 18V3z" />
    </svg>
  )
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
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
      <path
        d={direction === 'left' ? 'M12 4l-6 6 6 6' : 'M8 4l6 6-6 6'}
      />
    </svg>
  )
}
