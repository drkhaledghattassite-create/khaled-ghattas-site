import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { UserDetailPage } from '@/components/admin/users/UserDetailPage'
import { getServerSession } from '@/lib/auth/server'
import {
  getBookingOrdersByUserId,
  getLibraryEntriesByUserId,
  getOrdersByUserId,
  getTestAttemptsByUserId,
  getUserById,
  getUserQuestionsByUserId,
  getUserReceivedGifts,
  getUserSentGifts,
} from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// The (admin) layout already gates on ADMIN ∪ CLIENT. CLIENT viewers see the
// page in read-only mode (role-edit affordance hidden, identical to the list).
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function AdminUserDetailRoute({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const session = await getServerSession()
  const viewerRole = session?.user.role ?? 'USER'

  const user = await getUserById(id)
  if (!user) notFound()

  // All cross-feature data fetched in parallel. Each helper is independent;
  // a slow one (e.g. test attempts on a heavy account) shouldn't block the
  // others. Falls back to [] on any error so the page still renders.
  const [
    orders,
    bookingOrders,
    sentGifts,
    receivedGifts,
    questions,
    testAttempts,
    library,
  ] = await Promise.all([
    getOrdersByUserId(user.id).catch(() => []),
    getBookingOrdersByUserId(user.id).catch(() => []),
    getUserSentGifts(user.id).catch(() => []),
    getUserReceivedGifts(user.id, user.email).catch(() => []),
    getUserQuestionsByUserId(user.id).catch(() => []),
    getTestAttemptsByUserId(user.id).catch(() => []),
    getLibraryEntriesByUserId(user.id).catch(() => []),
  ])

  return (
    <UserDetailPage
      locale={locale === 'ar' ? 'ar' : 'en'}
      viewerRole={viewerRole}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
      }}
      orders={orders.map((o) => ({
        id: o.id,
        status: o.status,
        totalAmount: o.totalAmount,
        currency: o.currency,
        createdAt: o.createdAt.toISOString(),
      }))}
      bookingOrders={bookingOrders.map((o) => ({
        id: o.id,
        status: o.status,
        amountPaid: o.amountPaid,
        currency: o.currency,
        bookingTitleAr: o.bookingTitleAr,
        bookingTitleEn: o.bookingTitleEn,
        cohortLabelAr: o.cohortLabelAr,
        cohortLabelEn: o.cohortLabelEn,
        confirmedAt: o.confirmedAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
      }))}
      sentGifts={sentGifts.map((g) => ({
        id: g.id,
        status: g.status,
        itemType: g.itemType,
        recipientEmail: g.recipientEmail,
        amountCents: g.amountCents,
        currency: g.currency,
        createdAt: g.createdAt.toISOString(),
      }))}
      receivedGifts={receivedGifts.map((g) => ({
        id: g.id,
        status: g.status,
        itemType: g.itemType,
        senderUserId: g.senderUserId,
        amountCents: g.amountCents,
        currency: g.currency,
        createdAt: g.createdAt.toISOString(),
      }))}
      questions={questions.map((q) => ({
        id: q.id,
        subject: q.subject,
        status: q.status,
        category: q.category,
        createdAt: q.createdAt.toISOString(),
      }))}
      testAttempts={testAttempts.map((a) => ({
        id: a.id,
        scorePercentage: a.scorePercentage,
        correctCount: a.correctCount,
        totalCount: a.totalCount,
        testSlug: a.test.slug,
        testTitleAr: a.test.titleAr,
        testTitleEn: a.test.titleEn,
        completedAt: a.completedAt.toISOString(),
      }))}
      library={library.map((entry) => ({
        bookId: entry.book.id,
        bookSlug: entry.book.slug,
        bookTitleAr: entry.book.titleAr,
        bookTitleEn: entry.book.titleEn,
        productType: entry.book.productType,
        purchasedAt: entry.order.createdAt.toISOString(),
      }))}
    />
  )
}
