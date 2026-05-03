import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import { getBookById, userOwnsProduct } from '@/lib/db/queries'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { ContentPlaceholder } from '@/components/dashboard/ContentPlaceholder'

// Auth-gated route — render per-request so getServerSession sees real cookies.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string; sessionId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'library.placeholder.session' })
  return {
    title: t('title'),
    description: t('body'),
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export default async function LibrarySessionPage({ params }: Props) {
  const { locale, sessionId } = await params
  setRequestLocale(locale)

  const session = await getServerSession()
  if (!session) {
    redirect({ href: '/login', locale })
  }
  const userId = session!.user.id

  // Sessions are stored in the books table with productType='SESSION'.
  const book = await getBookById(sessionId)
  if (!book || book.productType !== 'SESSION') notFound()

  const owns = await userOwnsProduct(userId, book.id)
  if (!owns) notFound()

  return (
    <DashboardLayout activeTab="library" user={session!.user}>
      <ContentPlaceholder kind="session" />
    </DashboardLayout>
  )
}
