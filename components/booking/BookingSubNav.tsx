'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

type Props = {
  active: 'tours' | 'reconsider' | 'sessions'
  onJump: (id: string) => void
  toursOpen: number
  reconsiderHasOpen: boolean
  sessionsOpen: number
}

type Chip = {
  id: 'tours' | 'reconsider' | 'sessions'
  label: string
  count: number | null
  hasOpen: boolean
}

// SiteHeader is ~60px on desktop. Stuck offset is bumped to +8px so
// the sticky sub-bar leaves a visible breath between itself and the
// SiteHeader bottom border (was flush against it). The IntersectionObserver
// rootMargin matches so the stuck-state flip fires exactly when the
// sub-bar reaches its sticky top.
const STICKY_OFFSET = 68

/**
 * Sticky sub-nav with three chips. Active chip flips to fg1/bg. Each
 * chip can show a count badge and a small accent dot when its section
 * has open items.
 *
 * Both the SiteHeader and this sub-bar stay visible at all times.
 * Visual treatment changes between rest and stuck:
 *   - At rest: bordered/blurred bar in natural flow under the page hero.
 *   - When stuck: same treatment + a small top gap and a drop shadow so
 *     the sub-bar reads as a distinct surface floating below the
 *     SiteHeader instead of fusing into a single double-tall block.
 */
export function BookingSubNav({
  active,
  onJump,
  toursOpen,
  reconsiderHasOpen,
  sessionsOpen,
}: Props) {
  const t = useTranslations('booking.subnav')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { rootMargin: `-${STICKY_OFFSET}px 0px 0px 0px`, threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const chips: Chip[] = [
    {
      id: 'tours',
      label: t('tours'),
      count: toursOpen > 0 ? toursOpen : null,
      hasOpen: toursOpen > 0,
    },
    {
      id: 'reconsider',
      label: t('reconsider'),
      count: null,
      hasOpen: reconsiderHasOpen,
    },
    {
      id: 'sessions',
      label: t('sessions'),
      count: sessionsOpen > 0 ? sessionsOpen : null,
      hasOpen: sessionsOpen > 0,
    },
  ]

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      <nav
        aria-label={t('aria_label')}
        data-stuck={isStuck}
        className={`sticky top-[68px] z-[35] border-b border-[var(--color-border)] bg-[var(--color-bg)]/[0.94] supports-backdrop-filter:backdrop-blur-md transition-shadow duration-200 ${
          isStuck
            ? 'shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]'
            : 'shadow-none'
        }`}
      >
        <div
          className="mx-auto flex max-w-[var(--container-max)] items-center gap-2 overflow-x-auto overscroll-x-none [padding:14px_clamp(20px,5vw,56px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {chips.map((chip) => {
            const isActive = active === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => onJump(chip.id)}
                // py-3 ensures ≥44px touch target on mobile (WCAG AA / Apple
                // HIG). At md+ we shrink slightly since mouse precision is better
                // and the bar otherwise feels too chunky next to the page header.
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border px-4 py-3 text-[13.5px] font-semibold transition-colors md:min-h-0 md:py-2.5 ${
                  isActive
                    ? 'border-[var(--color-fg1)] bg-[var(--color-fg1)] text-[var(--color-bg)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-fg2)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg1)]'
                } ${isRtl ? 'font-arabic-body' : 'font-display'}`}
              >
                {chip.hasOpen && !isActive && (
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
                  />
                )}
                <span>{chip.label}</span>
                {chip.count != null && (
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-[7px] py-0.5 text-[11px] font-semibold [font-feature-settings:'tnum'] ${
                      isActive
                        ? 'bg-white/15 text-[var(--color-bg)]'
                        : 'bg-[var(--color-bg)] text-[var(--color-fg3)]'
                    }`}
                  >
                    {chip.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
