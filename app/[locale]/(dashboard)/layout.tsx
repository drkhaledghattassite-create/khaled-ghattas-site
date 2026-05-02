import type { ReactNode } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { AuthMenu } from '@/components/layout/AuthMenu'

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
  return (
    <>
      <SiteHeader
        authSlot={<AuthMenu variant="compact" />}
        mobileAuthSlot={<AuthMenu variant="stacked" />}
      />
      <main id="main-content" className="bg-[var(--color-bg)]">
        {children}
      </main>
      <SiteFooter />
    </>
  )
}
