import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { requireServerRole } from '@/lib/auth/server'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

// All admin routes are auth-gated via requireServerRole below. force-dynamic
// makes every admin page render per-request — without this, the catch around
// the auth call lets Next prerender the routes as static HTML with the
// /login redirect baked in, bouncing real admins to login.
export const dynamic = 'force-dynamic'

// Block search engines at the page level. The robots.txt disallow is the
// crawl gate; this is the index gate for URLs Googlebot may have discovered
// via inbound links.
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  let user
  try {
    user = await requireServerRole('ADMIN')
  } catch {
    redirect(`/${locale === 'ar' ? '' : `${locale}/`}login`)
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <AdminSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar user={user} />
        <main id="main-content" className="flex-1 overflow-x-hidden p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
