import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { LibraryView } from '@/components/dashboard/LibraryView'
import type { LibraryItem } from '@/components/dashboard/LibraryCard'
import { getLibraryEntriesByUserId } from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard.library.meta' })
  return { title: t('title'), description: t('description') }
}

async function buildLibraryItems(userId: string): Promise<LibraryItem[]> {
  const entries = await getLibraryEntriesByUserId(userId)
  return entries.map(({ order, item, book }) => {
    const isSession = book.productType === 'SESSION'
    return {
      id: `${order.id}:${item.id}`,
      type: isSession ? 'LECTURE' : 'BOOK',
      titleAr: book.titleAr,
      titleEn: book.titleEn,
      cover: book.coverImage,
      href: `/books/${book.slug}`,
      primaryHref: book.digitalFile ?? `/books/${book.slug}`,
      downloadHref: book.digitalFile ?? undefined,
      progress: 0,
    }
  })
}

export default async function DashboardLibraryPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getServerSession()
  if (!session) {
    redirect({ href: '/login', locale })
  }

  const items = await buildLibraryItems(session!.user.id)

  return (
    <DashboardLayout activeTab="library" user={session!.user}>
      <LibraryView items={items} />
    </DashboardLayout>
  )
}
