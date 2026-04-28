import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import { getUserById } from '@/lib/db/queries'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { SettingsView } from '@/components/dashboard/SettingsView'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard.settings.meta' })
  return { title: t('title'), description: t('description') }
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

  const dbUser = await getUserById(session!.user.id).catch(() => null)
  const initialPreferences = parsePreferences(dbUser?.preferences)

  return (
    <DashboardLayout activeTab="settings" user={session!.user}>
      <SettingsView initialPreferences={initialPreferences} />
    </DashboardLayout>
  )
}
