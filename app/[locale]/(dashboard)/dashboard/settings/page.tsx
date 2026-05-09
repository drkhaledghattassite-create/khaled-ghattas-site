import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import { getUserById } from '@/lib/db/queries'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { SettingsView } from '@/components/dashboard/SettingsView'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard.settings.meta' })
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

function parsePreferences(
  raw: string | null | undefined,
): { newsletter?: boolean; purchases?: boolean } {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object') {
      return parsed as { newsletter?: boolean; purchases?: boolean }
    }
  } catch {
    /* fall through */
  }
  return {}
}

export default async function DashboardSettingsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getServerSession()
  if (!session) {
    redirect({ href: '/login', locale })
  }

  const [dbUser, settings] = await Promise.all([
    getUserById(session!.user.id).catch(() => null),
    getCachedSiteSettings(),
  ])
  const initialPreferences = parsePreferences(dbUser?.preferences)

  return (
    <DashboardLayout
      activeTab="settings"
      user={session!.user}
      dashboardSettings={settings.dashboard}
    >
      <SettingsView initialPreferences={initialPreferences} />
    </DashboardLayout>
  )
}
