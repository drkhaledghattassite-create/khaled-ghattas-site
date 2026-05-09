import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import { getUserById } from '@/lib/db/queries'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { AccountView } from '@/components/dashboard/AccountView'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard.account.meta' })
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export default async function DashboardAccountPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getServerSession()
  if (!session) {
    redirect({ href: '/login', locale })
  }

  // Account tab is profile-only. The "continue reading" surface lives on the
  // Library tab (ContinueReadingHero) and the bookings recap lives on the
  // Bookings tab — duplicating them here is noise. AccountActivityStrip and
  // RecentBookingsCard are kept on disk for potential future use elsewhere.
  const [dbUser, settings] = await Promise.all([
    getUserById(session!.user.id).catch(() => null),
    getCachedSiteSettings(),
  ])

  return (
    <DashboardLayout
      activeTab="account"
      user={session!.user}
      dashboardSettings={settings.dashboard}
    >
      <AccountView user={session!.user} initialBio={dbUser?.bio ?? null} />
    </DashboardLayout>
  )
}
