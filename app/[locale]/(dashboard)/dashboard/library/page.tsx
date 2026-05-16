import type { Metadata } from 'next'
import { Suspense } from 'react'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { LibraryView } from '@/components/dashboard/LibraryView'
import { LibrarySkeleton } from '@/components/dashboard/LibrarySkeleton'
import type { LibraryItem } from '@/components/dashboard/LibraryCard'
import type { HeroActivity } from '@/components/dashboard/ContinueReadingHero'
import {
  getLibraryEntriesByUserId,
  getMostRecentActivity,
  getReadingProgress,
  getSessionAggregateProgress,
} from '@/lib/db/queries'
import { resolvePublicUrl } from '@/lib/storage/public-url'

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
  // Per-item progress fetch in parallel.
  //   BOOK  → reading_progress (Phase 2)
  //   SESSION → session aggregate progress (Phase 5: completedItems / totalItems)
  // Both helpers branch on MOCK_AUTH_ENABLED first, so this is safe in
  // every dev/prod combination. NOTE: the SESSION branch issues N queries
  // for N sessions in the user's library — fine at realistic scale
  // (~tens of sessions per user). Batch into a single GROUP-BY query if
  // we ever ship a "trending sessions" surface that pulls 100+ rows.
  const progresses = await Promise.all(
    entries.map(({ book }) =>
      book.productType === 'SESSION'
        ? getSessionAggregateProgress(userId, book.id)
        : getReadingProgress(userId, book.id),
    ),
  )
  // Resolve covers in parallel — Phase F2.
  const covers = await Promise.all(
    entries.map(({ book }) => resolvePublicUrl(book.coverImage)),
  )
  return entries.map(({ order, item, book }, idx) => {
    const isSession = book.productType === 'SESSION'
    const row = progresses[idx]
    const sessionAggregate =
      isSession && row && 'totalItems' in row ? row : null
    const readingRow = !isSession && row && 'lastPage' in row ? row : null
    const computedReading =
      readingRow && readingRow.totalPages > 0
        ? Math.round((readingRow.lastPage / readingRow.totalPages) * 100)
        : 0
    return {
      id: `${order.id}:${item.id}`,
      type: isSession ? 'LECTURE' : 'BOOK',
      bookId: book.id,
      titleAr: book.titleAr,
      titleEn: book.titleEn,
      cover: covers[idx] ?? book.coverImage,
      // Public marketing detail page — used by the "Details" link.
      href: `/books/${book.slug}`,
      // In-app reader / viewer route. The placeholder pages render a
      // "coming in Phase 2/4" notice today; they verify ownership server-side.
      primaryHref: isSession
        ? `/dashboard/library/session/${book.id}`
        : `/dashboard/library/read/${book.id}`,
      hasDownload: !isSession && Boolean(book.digitalFile),
      progress: isSession ? (sessionAggregate?.percent ?? 0) : computedReading,
      purchasedAt: order.createdAt.toISOString(),
      lastReadAt: readingRow ? readingRow.lastReadAt.toISOString() : null,
      lastPage: readingRow ? readingRow.lastPage : 0,
      totalPages: readingRow ? readingRow.totalPages : 0,
      sessionItemsTotal: sessionAggregate?.totalItems ?? 0,
      sessionItemsCompleted: sessionAggregate?.completedItems ?? 0,
      sessionItemsPartial: sessionAggregate?.partiallyWatchedItems ?? 0,
    }
  })
}

/**
 * Phase 5 — translate the unified continue-activity query result into the
 * client-side hero shape. The query returns Date objects + full Book/SessionItem
 * rows; the client component only needs the locale-specific titles and the
 * fields that drive the progress ring + timestamp readout.
 */
async function buildHeroActivity(userId: string): Promise<HeroActivity | null> {
  const activity = await getMostRecentActivity(userId)
  if (!activity) return null
  if (activity.type === 'BOOK') {
    const cover = (await resolvePublicUrl(activity.book.coverImage)) ?? '/dr khaled photo.jpeg'
    return {
      type: 'BOOK',
      bookId: activity.bookId,
      titleAr: activity.book.titleAr,
      titleEn: activity.book.titleEn,
      cover,
      primaryHref: `/dashboard/library/read/${activity.bookId}`,
      lastPage: activity.lastPage,
      totalPages: activity.totalPages,
    }
  }
  const cover = (await resolvePublicUrl(activity.session.coverImage)) ?? '/dr khaled photo.jpeg'
  return {
    type: 'SESSION',
    sessionId: activity.sessionId,
    sessionTitleAr: activity.session.titleAr,
    sessionTitleEn: activity.session.titleEn,
    itemTitle: activity.item.title,
    cover,
    primaryHref: `/dashboard/library/session/${activity.sessionId}`,
    lastPositionSeconds: activity.lastPositionSeconds,
    durationSeconds: activity.durationSeconds,
  }
}

async function LibraryData({ userId }: { userId: string }) {
  const [items, activity] = await Promise.all([
    buildLibraryItems(userId),
    buildHeroActivity(userId),
  ])
  return <LibraryView items={items} activity={activity} />
}

export default async function DashboardLibraryPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getServerSession()
  if (!session) {
    redirect({ href: '/login', locale })
  }

  const settings = await getCachedSiteSettings()

  return (
    <DashboardLayout
      activeTab="library"
      user={session!.user}
      dashboardSettings={settings.dashboard}
    >
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryData userId={session!.user.id} />
      </Suspense>
    </DashboardLayout>
  )
}
