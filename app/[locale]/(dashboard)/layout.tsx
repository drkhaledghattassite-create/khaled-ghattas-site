import type { ReactNode } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { AuthMenu } from '@/components/layout/AuthMenu'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { buildNavItems } from '@/lib/site-settings/build-nav'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

// Every dashboard page reads getServerSession to redirect anonymous users
// and personalize content; the AuthMenu rendered in this layout reads it
// too. force-dynamic makes the whole group render per-request — otherwise
// static prerender bakes session=null into the HTML and authenticated users
// are bounced to /login before they can see their library/settings.
export const dynamic = 'force-dynamic'

export default async function DashboardSectionLayout({ children, params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  // The same nav/footer toggles that gate the public site MUST also apply
  // to logged-in users. Without this, the dashboard chrome rendered the
  // full DEFAULT_NAV_ITEMS / DEFAULT_NAV in SiteHeader+SiteFooter, so
  // disabled nav items reappeared the moment a user signed in.
  const settings = await getCachedSiteSettings()
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
      <main id="main-content" className="bg-[var(--color-bg)]">
        {children}
      </main>
      <SiteFooter footer={settings.footer} nav={settings.navigation} />
    </>
  )
}
