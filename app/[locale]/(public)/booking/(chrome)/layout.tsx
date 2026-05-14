import type { ReactNode } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { BookingPageHeader } from '@/components/booking/BookingPageHeader'
import { BookingSubNav } from '@/components/booking/BookingSubNav'
import {
  getActiveOnlineSessions,
  getActiveTours,
  getReconsiderCourse,
} from '@/lib/db/queries'
import type { BookingWithHolds, Tour } from '@/lib/db/queries'
import { getCachedSiteSettings } from '@/lib/site-settings/get'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

// Booking layout owns the page chrome (heading + sub-nav) shared by all
// three sub-routes (/booking/tours, /booking/reconsider, /booking/sessions).
// Each sub-route fetches its own deep data; the layout only fetches the
// lightweight metrics needed for the status strip and the sub-nav badges.
//
// `force-dynamic` so coming-soon gating and counts always reflect the
// current site state — the data lives in admin-editable tables.
export const dynamic = 'force-dynamic'

function effectiveRemaining(b: BookingWithHolds): number {
  return Math.max(0, b.maxCapacity - b.bookedCount - b.activeHoldsCount)
}

function deriveState(b: BookingWithHolds): 'open' | 'sold_out' | 'closed' {
  if (b.bookingState === 'CLOSED') return 'closed'
  if (b.bookingState === 'SOLD_OUT') return 'sold_out'
  return effectiveRemaining(b) === 0 ? 'sold_out' : 'open'
}

export default async function BookingLayout({ children, params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const settings = await getCachedSiteSettings()
  // Coming-soon check at the LAYOUT level so all three sub-routes inherit
  // it — otherwise a user hitting /booking/tours directly would bypass the
  // placeholder. The sitemap also gates the routes on this same key.
  if (settings.coming_soon_pages.includes('booking')) {
    return <ComingSoon pageKey="booking" />
  }

  const [tours, sessions, reconsider] = await Promise.all([
    getActiveTours().catch((err) => {
      console.error('[booking/layout] getActiveTours', err)
      return [] as Tour[]
    }),
    getActiveOnlineSessions().catch((err) => {
      console.error('[booking/layout] getActiveOnlineSessions', err)
      return [] as BookingWithHolds[]
    }),
    getReconsiderCourse().catch((err) => {
      console.error('[booking/layout] getReconsiderCourse', err)
      return null as BookingWithHolds | null
    }),
  ])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingTours = tours.filter((t) => new Date(t.date) >= today)

  const toursOpen = upcomingTours.length
  const sessionsOpen = sessions.filter((s) => deriveState(s) === 'open').length
  const reconsiderState = reconsider ? deriveState(reconsider) : null
  const reconsiderCohortLabel = reconsider
    ? locale === 'ar'
      ? reconsider.cohortLabelAr
      : reconsider.cohortLabelEn
    : null

  const isRtl = locale === 'ar'

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="bg-[var(--color-bg)]">
      <BookingPageHeader
        toursOpen={toursOpen}
        sessionsOpen={sessionsOpen}
        reconsiderState={reconsiderState}
        reconsiderCohortLabel={reconsiderCohortLabel}
      />
      <BookingSubNav
        toursOpen={toursOpen}
        reconsiderHasOpen={reconsiderState === 'open'}
        sessionsOpen={sessionsOpen}
      />
      {children}
    </div>
  )
}
