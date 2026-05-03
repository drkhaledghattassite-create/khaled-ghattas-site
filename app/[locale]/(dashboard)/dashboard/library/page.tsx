import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { LibraryView } from '@/components/dashboard/LibraryView'
import type { LibraryItem } from '@/components/dashboard/LibraryCard'
import { getLibraryEntriesByUserId, getReadingProgress } from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard.library.meta' })
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

async function buildLibraryItems(userId: string): Promise<LibraryItem[]> {
  const entries = await getLibraryEntriesByUserId(userId)
  // Per-book progress fetch in parallel for BOOK items only — SESSION
  // progress lives in media_progress and ships in Phase 4. Mock-mode
  // and DB-fallback paths inside getReadingProgress make this safe to
  // call even without DATABASE_URL set; the persisted mock-store keeps
  // the percentages stable across dev-server restarts.
  const progresses = await Promise.all(
    entries.map(({ book }) =>
      book.productType === 'SESSION'
        ? Promise.resolve(null)
        : getReadingProgress(userId, book.id),
    ),
  )
  return entries.map(({ order, item, book }, idx) => {
    const isSession = book.productType === 'SESSION'
    const progressRow = progresses[idx]
    const computed =
      progressRow && progressRow.totalPages > 0
        ? Math.round((progressRow.lastPage / progressRow.totalPages) * 100)
        : 0
    return {
      id: `${order.id}:${item.id}`,
      type: isSession ? 'LECTURE' : 'BOOK',
      bookId: book.id,
      titleAr: book.titleAr,
      titleEn: book.titleEn,
      cover: book.coverImage,
      // Public marketing detail page — used by the "Details" link.
      href: `/books/${book.slug}`,
      // In-app reader / viewer route. The placeholder pages render a
      // "coming in Phase 2/4" notice today; they verify ownership server-side.
      primaryHref: isSession
        ? `/dashboard/library/session/${book.id}`
        : `/dashboard/library/read/${book.id}`,
      hasDownload: !isSession && Boolean(book.digitalFile),
      progress: isSession ? 0 : computed,
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
