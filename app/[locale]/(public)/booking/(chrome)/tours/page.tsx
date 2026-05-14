import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LegacyRedirectTracker } from '@/components/booking/LegacyRedirectTracker'
import { ToursPageClient } from '@/components/booking/ToursPageClient'
import { getActiveTours } from '@/lib/db/queries'
import type { Tour } from '@/lib/db/queries'
import { getServerSession } from '@/lib/auth/server'
import { pageMetadata } from '@/lib/seo/page-metadata'

type Props = { params: Promise<{ locale: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'booking.tours.meta' })
  return pageMetadata({
    locale,
    path: '/booking/tours',
    title: t('title'),
    description: t('description'),
  })
}

export default async function BookingToursRoute({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const [tours, session] = await Promise.all([
    getActiveTours().catch((err) => {
      console.error('[booking/tours] getActiveTours', err)
      return [] as Tour[]
    }),
    getServerSession().catch(() => null),
  ])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingTours = tours.filter((t) => new Date(t.date) >= today)
  const pastTours = tours
    .filter((t) => new Date(t.date) < today)
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )

  return (
    <>
      {/* Side-effect-only — fires a Vercel Analytics event when the page
          was reached via the /booking → /booking/tours legacy redirect
          (marker: ?from=legacy-booking), then strips the marker from the
          URL. Wrapped in Suspense because useSearchParams() inside it
          would otherwise opt the whole tree into client rendering. */}
      <Suspense fallback={null}>
        <LegacyRedirectTracker />
      </Suspense>
      <ToursPageClient
        tours={upcomingTours}
        pastTours={pastTours}
        hasSession={!!session}
      />
    </>
  )
}
