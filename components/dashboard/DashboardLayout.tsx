'use client'

import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link, usePathname } from '@/lib/i18n/navigation'
import type { ServerSessionUser } from '@/lib/auth/server'
import type { SiteSettings } from '@/lib/site-settings/types'

type TabKey = 'account' | 'library' | 'bookings' | 'ask' | 'settings'

// Maps each tab key to the site-settings flag that gates its visibility.
// Adding a new tab? Add the flag to `SiteSettings.dashboard` first, then
// extend this map and the TABS array below — no other call sites change.
const TAB_VISIBILITY_KEY: Record<TabKey, keyof SiteSettings['dashboard']> = {
  account: 'show_account_tab',
  library: 'show_library_tab',
  bookings: 'show_bookings_tab',
  ask: 'show_ask_tab',
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
  { key: 'settings' as const, href: '/dashboard/settings' },
] as const

// Back-compat fallback when a caller forgets to pass dashboardSettings —
// every tab visible. Should only fire from Storybook or pre-A3 callers.
const ALL_TABS_VISIBLE: SiteSettings['dashboard'] = {
  show_account_tab: true,
  show_library_tab: true,
  show_bookings_tab: true,
  show_ask_tab: true,
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

      {/* Tabs nav — sticky below site header */}
      <div className="sticky top-[52px] md:top-[60px] z-30 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-[var(--container-max)] [padding:0_clamp(20px,5vw,56px)] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <ul role="tablist" className="flex items-center gap-1 m-0 p-0 list-none min-w-max">
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
