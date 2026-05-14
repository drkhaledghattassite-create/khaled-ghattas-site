import { setRequestLocale } from 'next-intl/server'
import { AdminDashboardHome } from '@/components/admin/AdminDashboardHome'
import { getServerSession } from '@/lib/auth/server'
import {
  countQueueByStatus,
  getAdminBookingOrders,
  getAdminQuestions,
  getAudienceSnapshotCounts,
  getNewCorporateRequestCount,
  getPendingBookingInterestCount,
  getPendingGiftCountExpiringWithin,
  getPendingQuestionCount,
  getRecentOrders,
  getRevenueByDayWithComparison,
  getSubscribersByDayWithComparison,
  getTestHighlightForResearch,
  getTopTestsByAttemptsWithin,
  type TestResearchHighlight,
} from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

// Every individual query is wrapped in .catch(emptyShape) so one slow or
// failed read can't tank the entire dashboard. The Promise.all then
// always resolves; the affected section renders its own empty state.

export default async function AdminHomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getServerSession()
  const userName = session?.user?.name ?? null
  const viewerRole = session?.user?.role ?? null

  const [
    revenue,
    subscribers,
    audience,
    pendingQuestions,
    pendingInterest,
    expiringGifts,
    newCorporateRequests,
    queueCounts,
    orders,
    bookingOrdersPage,
    questionsPage,
    topTests,
  ] = await Promise.all([
    getRevenueByDayWithComparison(30).catch(() => ({
      current: [],
      prior: [],
      currentTotal: 0,
      priorTotal: 0,
      deltaPercent: null,
    })),
    getSubscribersByDayWithComparison(30).catch(() => ({
      current: [],
      prior: [],
      currentTotal: 0,
      priorTotal: 0,
      deltaPercent: null,
    })),
    getAudienceSnapshotCounts().catch(() => ({
      activeSubscribers: 0,
      subscribersThisWeek: 0,
      registeredUsers: 0,
      usersThisWeek: 0,
      booksPublished: 0,
      testsPublished: 0,
    })),
    getPendingQuestionCount().catch(() => 0),
    getPendingBookingInterestCount().catch(() => 0),
    getPendingGiftCountExpiringWithin(7).catch(() => 0),
    getNewCorporateRequestCount().catch(() => 0),
    countQueueByStatus().catch(() => ({
      PENDING: 0,
      SENDING: 0,
      SENT: 0,
      FAILED: 0,
      EXHAUSTED: 0,
    })),
    getRecentOrders(3).catch(() => []),
    getAdminBookingOrders({ status: 'all', page: 1, pageSize: 3 }).catch(
      () => ({ rows: [], total: 0, page: 1, pageSize: 3 }),
    ),
    getAdminQuestions({ status: 'all', page: 1, pageSize: 3 }).catch(() => ({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 3,
    })),
    getTopTestsByAttemptsWithin(30, 3).catch(() => []),
  ])

  // Research highlights fetch one per top test, in parallel. A null result
  // (zero attempts) drops out of the list.
  const researchHighlights: TestResearchHighlight[] = (
    await Promise.all(
      topTests.map((t) =>
        getTestHighlightForResearch(t.testId).catch(() => null),
      ),
    )
  ).filter((h): h is TestResearchHighlight => h !== null)

  const emailQueueAttention = queueCounts.EXHAUSTED + queueCounts.FAILED

  return (
    <AdminDashboardHome
      locale={locale}
      userName={userName}
      viewerRole={viewerRole}
      attentionCounts={{
        pendingQuestions,
        newCorporateRequests,
        expiringGifts,
        pendingInterest,
        emailQueueAttention,
      }}
      greetingCounts={{
        pendingQuestions,
        newCorporateRequests,
        expiringGifts,
        revenueDeltaPercent: revenue.deltaPercent,
        pendingBookingInterest: pendingInterest,
      }}
      audience={audience}
      revenue={revenue}
      subscribers={subscribers}
      orders={orders}
      bookingOrders={bookingOrdersPage.rows}
      questions={questionsPage.rows}
      researchHighlights={researchHighlights}
    />
  )
}
