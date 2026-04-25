import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { requireRole } from '@/lib/auth/mock'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  let user
  try {
    user = await requireRole('ADMIN')
  } catch {
    redirect(`/${locale === 'ar' ? '' : `${locale}/`}login`)
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <AdminSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar user={user} />
        <main className="flex-1 overflow-x-hidden p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
