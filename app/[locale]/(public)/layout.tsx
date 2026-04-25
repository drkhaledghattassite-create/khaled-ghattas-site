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

export default async function PublicLayout({ children, params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <>
      <SiteHeader authSlot={<AuthMenu variant="compact" />} />
      <main id="main-content" className="min-h-dvh pb-[72px] md:pb-[68px]">{children}</main>
      <SiteFooter />
      <BottomNav mobileAuthSlot={<AuthMenu variant="stacked" />} />
    </>
  )
}
