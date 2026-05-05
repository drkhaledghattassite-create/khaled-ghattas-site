'use client'

import { useLocale } from 'next-intl'
import { useReducedMotion } from '@/lib/motion/hooks'

/**
 * Initial-load skeleton for /dashboard/library. Matches the real layout's
 * shape so swapping in real content does not shift layout: header, filter
 * row, grid of cards. Pulse animation is dropped under prefers-reduced-
 * motion (replaced with a static dimmed placeholder).
 *
 * Filter/sort transitions are client-side and don't re-render this — they
 * only flip the visible items in place. So this component runs exactly
 * once: the first time the user opens /dashboard/library.
 */
export function LibrarySkeleton() {
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const reduceMotion = useReducedMotion()
  const pulse = reduceMotion ? '' : 'animate-pulse'
  const bone = `rounded-[var(--radius-sm)] bg-[var(--color-bg-deep)] ${pulse}`

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-hidden
      className="flex flex-col gap-[clamp(32px,4vw,56px)]"
    >
      {/* Header */}
      <div className="flex flex-col gap-3">
        <span className={`block h-3 w-20 ${bone}`} />
        <span className={`block h-9 w-72 max-w-full ${bone}`} />
        <span className={`block h-4 w-full max-w-[420px] ${bone}`} />
      </div>

      {/* Hero card placeholder — the real hero only renders when there's
          progress; since we don't yet know, we show a slightly smaller
          card here so the swap-in feels intentional rather than empty. */}
      <div className="grid items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 sm:gap-6 sm:p-6 grid-cols-[80px_1fr] md:grid-cols-[120px_1fr_auto] md:p-7">
        <div
          className={`aspect-[2/3] w-[80px] md:w-[120px] ${bone}`}
        />
        <div className="flex min-w-0 flex-col gap-2">
          <span className={`block h-3 w-24 ${bone}`} />
          <span className={`block h-6 w-3/4 ${bone}`} />
          <span className={`block h-3 w-32 ${bone}`} />
        </div>
        <div className="col-span-2 flex items-center justify-between gap-4 md:col-span-1 md:flex-col md:items-end md:gap-3">
          <span className={`block h-16 w-16 rounded-full bg-[var(--color-bg-deep)] ${pulse}`} />
          <span className={`block h-9 w-24 rounded-full bg-[var(--color-bg-deep)] ${pulse}`} />
        </div>
      </div>

      {/* Filter chips + sort row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`block h-9 w-16 rounded-full bg-[var(--color-bg-deep)] ${pulse}`} />
          <span className={`block h-9 w-20 rounded-full bg-[var(--color-bg-deep)] ${pulse}`} />
          <span className={`block h-9 w-20 rounded-full bg-[var(--color-bg-deep)] ${pulse}`} />
        </div>
        <span className={`block h-9 w-36 rounded-full bg-[var(--color-bg-deep)] ${pulse}`} />
      </div>

      {/* Card grid */}
      <div className="grid gap-4 sm:gap-5 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5"
          >
            <span className={`block aspect-[2/3] w-full ${bone}`} />
            <div className="flex flex-col gap-3">
              <span className={`block h-5 w-3/4 ${bone}`} />
              <div className="flex items-baseline justify-between gap-2">
                <span className={`block h-3 w-20 ${bone}`} />
                <span className={`block h-3 w-10 ${bone}`} />
              </div>
              <span className={`block h-1.5 w-full rounded-full bg-[var(--color-bg-deep)] ${pulse}`} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`block h-9 flex-1 min-w-0 rounded-full bg-[var(--color-bg-deep)] ${pulse}`} />
                <span className={`block h-9 w-20 rounded-full bg-[var(--color-bg-deep)] ${pulse}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
