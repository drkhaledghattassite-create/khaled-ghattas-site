import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getMockSession } from '@/lib/auth/mock'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { LibraryView } from '@/components/dashboard/LibraryView'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard.library.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function DashboardLibraryPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getMockSession()
  if (!session) {
    redirect({ href: '/login', locale })
  }

  return (
    <DashboardLayout activeTab="library" user={session!.user}>
      <LibraryView />
    </DashboardLayout>
  )
}
