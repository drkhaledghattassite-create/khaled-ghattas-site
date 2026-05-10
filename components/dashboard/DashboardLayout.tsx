'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link, usePathname } from '@/lib/i18n/navigation'
import type { ServerSessionUser } from '@/lib/auth/server'
import type { SiteSettings } from '@/lib/site-settings/types'

type TabKey = 'account' | 'library' | 'bookings' | 'ask' | 'tests' | 'settings'

// Maps each tab key to the site-settings flag that gates its visibility.
// Adding a new tab? Add the flag to `SiteSettings.dashboard` first, then
// extend this map and the TABS array below — no other call sites change.
const TAB_VISIBILITY_KEY: Record<TabKey, keyof SiteSettings['dashboard']> = {
  account: 'show_account_tab',
  library: 'show_library_tab',
  bookings: 'show_bookings_tab',
  ask: 'show_ask_tab',
  tests: 'show_tests_tab',
  settings: 'show_settings_tab',
}

const TABS = [
  { key: 'account' as const, href: '/dashboard' },
  { key: 'library' as const, href: '/dashboard/library' },
  { key: 'bookings' as const, href: '/dashboard/bookings' },
  // 'ask' is positioned between bookings and settings — content-creation
  // surface (creator-side) sits between consumption (bookings) and account
  // chrome (settings).
  { key: 'ask' as const, href: '/dashboard/ask' },
  // 'tests' sits next to 'ask' — both are reflective surfaces from
  // Dr. Khaled's editorial side. Tests history is a personal record;
  // settings still anchors the trailing edge as account chrome.
  { key: 'tests' as const, href: '/dashboard/tests' },
  { key: 'settings' as const, href: '/dashboard/settings' },
] as const

// Back-compat fallback when a caller forgets to pass dashboardSettings —
// every tab visible. Should only fire from Storybook or pre-A3 callers.
const ALL_TABS_VISIBLE: SiteSettings['dashboard'] = {
  show_account_tab: true,
  show_library_tab: true,
  show_bookings_tab: true,
  show_ask_tab: true,
  show_tests_tab: true,
  show_settings_tab: true,
}

const initialOf = (name: string) =>
  name.trim().split(/\s+/)[0]?.charAt(0).toUpperCase() ?? 'U'

export function DashboardLayout({
  children,
  activeTab,
  user,
  dashboardSettings = ALL_TABS_VISIBLE,
}: {
  children: ReactNode
  activeTab: TabKey
  user: ServerSessionUser
  /**
   * Threaded from `getCachedSiteSettings().dashboard`. Each tab's visibility
   * is gated by its corresponding `show_*_tab` flag. Hiding a tab DOES NOT
   * block the route — deep links still resolve. Hiding the tab the user is
   * currently ON is harmless (the layout still renders the page; the nav
   * just shows the OTHER tabs).
   */
  dashboardSettings?: SiteSettings['dashboard']
}) {
  const t = useTranslations('dashboard.tabs')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const pathname = usePathname()

  // Stuck-state detection — when the tabs strip sticks under the
  // SiteHeader on scroll, we add a drop shadow so the two bars read as
  // distinct surfaces instead of fusing into one double-tall block.
  // The bar itself is always shown (border + blurred bg) — the shadow
  // is the only thing that toggles. rootMargin uses 60px (the desktop
  // sticky offset); on mobile the flip fires ~8px early, imperceptible.
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { rootMargin: '-60px 0px 0px 0px', threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const since = isRtl ? 'عضو منذ يناير ٢٠٢٦' : 'Member since January 2026'

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-dvh bg-[var(--color-bg)]">
      {/* Account header — avatar + identity + since */}
      <div className="mx-auto max-w-[var(--container-max)] [padding:clamp(32px,4vw,56px)_clamp(20px,5vw,56px)_clamp(24px,3vw,40px)]">
        <header className="grid items-center gap-6 pb-8 border-b border-[var(--color-border)] grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto]">
          <span
            aria-hidden
            className={`inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[28px] font-bold shrink-0 ${
              isRtl ? 'font-arabic-display' : 'font-display'
            }`}
          >
            {initialOf(user.name)}
          </span>

          <div className="flex flex-col gap-1.5 min-w-0">
            <h1
              className={`m-0 text-[clamp(22px,2.6vw,30px)] leading-[1.2] font-bold tracking-[-0.005em] text-[var(--color-fg1)] truncate ${
                isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.018em]'
              }`}
            >
              {user.name}
            </h1>
            <p
              className={`m-0 text-[14px] text-[var(--color-fg3)] truncate ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {user.email}
            </p>
          </div>

          <span
            className={`hidden md:inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-fg3)] text-end ${
              isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
            }`}
          >
            {since}
          </span>
        </header>
      </div>

      {/* Tabs nav — sticky below site header. Bar styling is constant
          (always bordered + blurred); a drop shadow toggles on the
          stuck state so the bar reads as a distinct floating surface
          below the SiteHeader instead of fusing with it.
          Sticky offset is bumped from 52/60 to 60/68 so the bar leaves
          a small breathing gap below the SiteHeader's bottom border.
          Width strategy: the ul uses `w-max mx-auto` so it sizes exactly
          to its tab content and centers when it fits in the viewport. The
          parent's `overflow-x-auto` only kicks in when the ul actually
          overflows (many tabs on a small phone). `overscroll-x-none`
          prevents iOS Safari's rubber-band drag from exposing empty scroll
          area beyond the tabs — without it, users can drag the strip into
          phantom empty space even when no horizontal scroll is needed. */}
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      <div
        data-stuck={isStuck}
        className={`sticky top-[60px] md:top-[68px] z-30 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)] transition-shadow duration-200 ${
          isStuck
            ? 'shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]'
            : 'shadow-none'
        }`}
      >
        <div className="mx-auto max-w-[var(--container-max)] [padding:0_clamp(20px,5vw,56px)] overflow-x-auto overscroll-x-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <ul role="tablist" className="flex items-center gap-1 m-0 p-0 list-none w-max mx-auto">
            {TABS.filter((tab) => dashboardSettings[TAB_VISIBILITY_KEY[tab.key]]).map((tab) => {
              const isActive =
                tab.key === activeTab ||
                tab.href === pathname ||
                (tab.key === 'account' && pathname === '/dashboard')
              return (
                <li key={tab.key} className="relative">
                  <Link
                    href={tab.href}
                    role="tab"
                    aria-selected={isActive}
                    className={`relative inline-flex items-center px-4 py-4 text-[14px] font-semibold transition-colors ${
                      isActive
                        ? 'text-[var(--color-fg1)]'
                        : 'text-[var(--color-fg3)] hover:text-[var(--color-fg2)]'
                    } ${isRtl ? 'font-arabic-body' : 'font-display'}`}
                  >
                    {t(tab.key)}
                    {isActive && (
                      <motion.span
                        layoutId="dashboard-tab-rule"
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-x-3 -bottom-px h-[2px] bg-[var(--color-accent)]"
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Page content */}
      <div className="mx-auto max-w-[var(--container-max)] [padding:clamp(32px,4vw,56px)_clamp(20px,5vw,56px)_clamp(64px,8vw,112px)]">
        {children}
      </div>
    </div>
  )
}
