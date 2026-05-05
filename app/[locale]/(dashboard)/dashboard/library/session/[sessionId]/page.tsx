import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import {
  getAllMediaProgressForSession,
  getBookById,
  getSessionItemsBySessionId,
  userOwnsProduct,
  type MediaProgress,
  type SessionItem,
} from '@/lib/db/queries'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { SessionViewer } from '@/components/library/session/SessionViewer'
import { SessionEmptyState } from '@/components/library/session/SessionEmptyState'

// Auth-gated route — render per-request so getServerSession sees real cookies.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string; sessionId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, sessionId } = await params
  const book = await getBookById(sessionId)
  const isAr = locale === 'ar'
  const title = book ? (isAr ? book.titleAr : book.titleEn) : 'Session'
  return {
    title,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

/**
 * Pick the item the viewer should auto-select on first load.
 *
 * Priority:
 *   1. Most-recently-watched non-completed item (by lastWatchedAt desc)
 *   2. First not-yet-started item by sortOrder (so a completed first item
 *      doesn't pin the viewer if there are unstarted items after it)
 *   3. First item by sortOrder (when everything is completed — replay UX)
 *
 * Items are passed in already sorted by `getSessionItemsBySessionId`
 * (sortOrder ASC, createdAt ASC tiebreaker).
 */
function pickInitialItemId(
  items: SessionItem[],
  progress: Record<string, Pick<MediaProgress, 'lastWatchedAt' | 'completedAt'>>,
): string | null {
  if (items.length === 0) return null

  let mostRecent: { id: string; ts: number } | null = null
  for (const item of items) {
    const entry = progress[item.id]
    if (!entry || entry.completedAt != null) continue
    const ts = entry.lastWatchedAt.getTime()
    if (!mostRecent || ts > mostRecent.ts) {
      mostRecent = { id: item.id, ts }
    }
  }
  if (mostRecent) return mostRecent.id

  const firstUnstarted = items.find((it) => !progress[it.id])
  if (firstUnstarted) return firstUnstarted.id

  return items[0]!.id
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

  // Ownership gate. Same helper used by /api/content/access. Don't expose
  // 404 vs 403 for unowned-but-existing sessions; redirect to library to
  // avoid leaking catalog membership.
  const owns = await userOwnsProduct(userId, book.id)
  if (!owns) {
    redirect({ href: '/dashboard/library', locale })
  }

  const t = await getTranslations({ locale, namespace: 'session' })
  const viewerLocale: 'ar' | 'en' = locale === 'ar' ? 'ar' : 'en'

  // Items + progress in parallel — independent reads.
  const [items, progress] = await Promise.all([
    getSessionItemsBySessionId(book.id),
    getAllMediaProgressForSession(userId, book.id),
  ])

  const sessionTitle = viewerLocale === 'ar' ? book.titleAr : book.titleEn
  const sessionDescription =
    viewerLocale === 'ar' ? book.descriptionAr : book.descriptionEn

  // Empty session — admin hasn't populated session_items yet. Render an
  // empty state inside the dashboard chrome rather than crashing or 404ing
  // (the user owns the product; the content is just being prepared).
  if (items.length === 0) {
    return (
      <DashboardLayout activeTab="library" user={session!.user}>
        <SessionEmptyState
          locale={viewerLocale}
          title={t('empty.title')}
          body={t('empty.body')}
          backHref="/dashboard/library"
          backLabel={t('back_to_library')}
        />
      </DashboardLayout>
    )
  }

  const initialItemId = pickInitialItemId(items, progress) ?? items[0]!.id

  // Serialise progress dates to ISO strings for the client component —
  // server-component → client-component prop boundaries don't preserve
  // Date instances cleanly across the RSC payload.
  const serializedProgress: Record<
    string,
    {
      lastPositionSeconds: number
      completedAt: string | null
      lastWatchedAt: string
    }
  > = {}
  for (const [itemId, entry] of Object.entries(progress)) {
    serializedProgress[itemId] = {
      lastPositionSeconds: entry.lastPositionSeconds,
      completedAt: entry.completedAt?.toISOString() ?? null,
      lastWatchedAt: entry.lastWatchedAt.toISOString(),
    }
  }

  return (
    <DashboardLayout activeTab="library" user={session!.user}>
      <SessionViewer
        sessionId={book.id}
        sessionTitle={sessionTitle}
        sessionDescription={sessionDescription}
        coverImage={book.coverImage}
        items={items}
        initialItemId={initialItemId}
        progress={serializedProgress}
        locale={viewerLocale}
      />
    </DashboardLayout>
  )
}
