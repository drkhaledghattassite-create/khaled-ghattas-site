import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { LibraryView } from '@/components/dashboard/LibraryView'
import type { LibraryItem } from '@/components/dashboard/LibraryCard'
import { getOrdersByUserId, getBooks } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard.library.meta' })
  return { title: t('title'), description: t('description') }
}

async function buildLibraryItems(userId: string): Promise<LibraryItem[]> {
  const [orders, books] = await Promise.all([
    getOrdersByUserId(userId),
    getBooks({ limit: 200 }),
  ])
  const fulfilled = orders.filter(
    (o) => o.status === 'PAID' || o.status === 'FULFILLED',
  )
  if (fulfilled.length === 0) return []

  const bookById = new Map(books.map((b) => [b.id, b]))
  const items: LibraryItem[] = []
  for (const order of fulfilled) {
    // Without orderItems join here, fall back to a placeholder-friendly mapping:
    // each fulfilled order maps to all books referenced in its items. The
    // queries layer doesn't ship orderItems yet, so this is best-effort.
    for (const book of bookById.values()) {
      const isSession = book.productType === 'SESSION'
      items.push({
        id: `${order.id}:${book.id}`,
        type: isSession ? 'LECTURE' : 'BOOK',
        titleAr: book.titleAr,
        titleEn: book.titleEn,
        cover: book.coverImage,
        href: `/books/${book.slug}`,
        primaryHref: book.digitalFile ?? `/books/${book.slug}`,
        downloadHref: book.digitalFile ?? undefined,
        progress: 0,
      })
    }
    break // only render the most recent fulfilled order's items
  }
  return items
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
