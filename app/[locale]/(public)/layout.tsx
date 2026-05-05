import type { ReactNode } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { SiteHeader, type NavItem } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { AuthMenu } from '@/components/layout/AuthMenu'
import { getCachedSiteSettings } from '@/lib/site-settings/get'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Build the visible nav items from current settings.
 *
 * `home` is always present. Every other item is gated only by its
 * `show_nav_*` toggle. Coming-soon pages still appear in nav — clicking
 * one renders the coming-soon screen instead of the page content. Hide
 * (nav toggle) and Coming Soon are independent concerns.
 */
function buildNavItems(settings: Awaited<ReturnType<typeof getCachedSiteSettings>>): NavItem[] {
  const { navigation } = settings
  const items: NavItem[] = [{ key: 'home', href: '/' }]
  if (navigation.show_nav_about) items.push({ key: 'about', href: '/about' })
  if (navigation.show_nav_books) items.push({ key: 'store', href: '/books' })
  if (navigation.show_nav_articles) items.push({ key: 'articles', href: '/articles' })
  if (navigation.show_nav_interviews) items.push({ key: 'interviews', href: '/interviews' })
  if (navigation.show_nav_events) items.push({ key: 'events', href: '/events' })
  if (navigation.show_nav_corporate)
    items.push({ key: 'corporate', href: '/corporate' })
  if (navigation.show_nav_contact) items.push({ key: 'contact', href: '/contact' })
  return items
}

export default async function PublicLayout({ children, params }: Props) {
  const { locale } = await params
  console.log('[PublicLayout] start, locale=', locale)
  setRequestLocale(locale)
  let settings
  try {
    settings = await getCachedSiteSettings()
    console.log('[PublicLayout] settings ok')
  } catch (e) {
    console.error('[PublicLayout] settings failed', e)
    throw e
  }

  const navItems = buildNavItems(settings)
  const showLocaleSwitcher = settings.navigation.show_locale_switcher
  const authEnabled = settings.features.auth_enabled

  return (
    <>
      <SiteHeader
        navItems={navItems}
        showLocaleSwitcher={showLocaleSwitcher}
        authSlot={<AuthMenu variant="compact" enabled={authEnabled} />}
        mobileAuthSlot={<AuthMenu variant="stacked" enabled={authEnabled} />}
      />
      <main id="main-content" className="min-h-dvh">
        {children}
      </main>
      <SiteFooter
        footer={settings.footer}
        nav={settings.navigation}
      />
    </>
  )
}
