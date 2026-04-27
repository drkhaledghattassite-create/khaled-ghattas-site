import type { ReactNode } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { BottomNav } from '@/components/layout/BottomNav'
import { AuthMenu } from '@/components/layout/AuthMenu'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function DashboardSectionLayout({ children, params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <>
      <SiteHeader authSlot={<AuthMenu variant="compact" />} />
      <main id="main-content" className="bg-[var(--color-bg)] pb-[60px] md:pb-0">
        {children}
      </main>
      <SiteFooter />
      <BottomNav mobileAuthSlot={<AuthMenu variant="stacked" />} />
    </>
  )
}
