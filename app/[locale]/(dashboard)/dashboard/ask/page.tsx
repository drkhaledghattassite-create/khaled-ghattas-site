import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import { getUserQuestionsByUserId } from '@/lib/db/queries'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import {
  AskDrKhaledPage,
  type ClientUserQuestion,
} from '@/components/dashboard/ask/AskDrKhaledPage'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Same pattern as the rest of the dashboard.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard.ask.meta' })
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export default async function DashboardAskPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getServerSession()
  if (!session) {
    redirect({ href: '/login', locale })
  }

  // Fetch in parallel: user history + site settings (for the tab visibility
  // flag). Default limit is 50 inside the helper, which is plenty for v1
  // (no user ever sends more than a few dozen questions).
  const [questions, settings] = await Promise.all([
    getUserQuestionsByUserId(session!.user.id, { limit: 50 }),
    getCachedSiteSettings(),
  ])

  // Project to a serialisable shape for the client component. Drizzle Date
  // instances don't survive the RSC payload as Dates — they round-trip as
  // strings. Better to convert explicitly here than rely on coincidence.
  const initialItems: ClientUserQuestion[] = questions.map((q) => ({
    id: q.id,
    subject: q.subject,
    body: q.body,
    category: q.category,
    status: q.status,
    answerReference: q.answerReference,
    answeredAt: q.answeredAt?.toISOString() ?? null,
    createdAt: q.createdAt.toISOString(),
  }))

  const viewerLocale: 'ar' | 'en' = locale === 'ar' ? 'ar' : 'en'

  return (
    <DashboardLayout
      activeTab="ask"
      user={session!.user}
      dashboardSettings={settings.dashboard}
    >
      <AskDrKhaledPage
        locale={viewerLocale}
        initialItems={initialItems}
        userFirstName={(session!.user.name ?? '').split(/\s+/)[0] ?? ''}
      />
    </DashboardLayout>
  )
}
