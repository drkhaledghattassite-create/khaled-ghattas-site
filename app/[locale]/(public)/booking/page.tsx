import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { BookingPage } from '@/components/booking/BookingPage'
import {
  getActiveOnlineSessions,
  getActiveTours,
  getPaidBookingIdsForUser,
  getReconsiderCourse,
} from '@/lib/db/queries'
import type { BookingWithHolds, Tour } from '@/lib/db/queries'
import { getServerSession } from '@/lib/auth/server'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { getCachedSiteSettings } from '@/lib/site-settings/get'

type Props = { params: Promise<{ locale: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'booking.meta' })
  return pageMetadata({
    locale,
    path: '/booking',
    title: t('title'),
    description: t('description'),
  })
}

export default async function BookingRoute({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const settings = await getCachedSiteSettings()
  if (settings.coming_soon_pages.includes('booking')) {
    return <ComingSoon pageKey="booking" />
  }

  // Each fetch wrapped in try/catch so a single failing query doesn't 500
  // the whole page.
  const [tours, reconsider, sessions, session] = await Promise.all([
    getActiveTours().catch((err) => {
      console.error('[booking/page] getActiveTours', err)
      return [] as Tour[]
    }),
    getReconsiderCourse().catch((err) => {
      console.error('[booking/page] getReconsiderCourse', err)
      return null as BookingWithHolds | null
    }),
    getActiveOnlineSessions().catch((err) => {
      console.error('[booking/page] getActiveOnlineSessions', err)
      return [] as BookingWithHolds[]
    }),
    getServerSession().catch(() => null),
  ])

  // Already-booked guard: only fetch when there's a session. Logged-out
  // visitors get [] (correct — they can't have a booking_orders row). The
  // helper is bounded to the user's own rows, so cost is negligible at our
  // expected per-user volumes.
  const paidBookingIds = session
    ? await getPaidBookingIdsForUser(session.user.id).catch((err) => {
        console.error('[booking/page] getPaidBookingIdsForUser', err)
        return [] as string[]
      })
    : []

  // Past tours cutoff: start-of-today (date-only) per plan. Computed
  // server-side so the client never recomputes Date.now() on hydrate.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingTours = tours.filter((t) => new Date(t.date) >= today)
  const pastTours = tours
    .filter((t) => new Date(t.date) < today)
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )

  return (
    <BookingPage
      tours={upcomingTours}
      pastTours={pastTours}
      reconsider={reconsider}
      sessions={sessions}
      hasSession={!!session}
      paidBookingIds={paidBookingIds}
      allowGifting={settings.gifts.allow_user_to_user}
    />
  )
}
