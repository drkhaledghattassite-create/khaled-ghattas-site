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

export default async function PublicLayout({ children, params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
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
