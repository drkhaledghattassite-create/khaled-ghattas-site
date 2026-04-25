import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { BottomNav } from '@/components/layout/BottomNav'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-dvh pb-[60px]">{children}</main>
      <SiteFooter />
      <BottomNav />
    </>
  )
}
