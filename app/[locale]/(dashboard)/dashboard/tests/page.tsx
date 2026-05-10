import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import { getTestAttemptsByUserId } from '@/lib/db/queries'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import {
  DashboardTestsTab,
  type ClientTestAttempt,
} from '@/components/dashboard/tests/DashboardTestsTab'

// Auth-gated route — render per-request so getServerSession sees real cookies.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard.tests.meta' })
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export default async function DashboardTestsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getServerSession()
  if (!session) {
    redirect({ href: '/login', locale })
  }

  const [attempts, settings] = await Promise.all([
    getTestAttemptsByUserId(session!.user.id, { limit: 50 }),
    getCachedSiteSettings(),
  ])

  // Project to a serialisable shape — the layout layer can't pass Date
  // instances through the RSC payload as Date objects.
  const initialItems: ClientTestAttempt[] = attempts.map((a) => ({
    id: a.id,
    scorePercentage: a.scorePercentage,
    correctCount: a.correctCount,
    totalCount: a.totalCount,
    completedAt: a.completedAt.toISOString(),
    test: a.test,
  }))

  const viewerLocale: 'ar' | 'en' = locale === 'ar' ? 'ar' : 'en'

  return (
    <DashboardLayout
      activeTab="tests"
      user={session!.user}
      dashboardSettings={settings.dashboard}
    >
      <DashboardTestsTab locale={viewerLocale} attempts={initialItems} />
    </DashboardLayout>
  )
}
