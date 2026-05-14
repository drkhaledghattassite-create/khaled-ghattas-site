import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ReconsiderPageClient } from '@/components/booking/ReconsiderPageClient'
import {
  getPaidBookingIdsForUser,
  getReconsiderCourse,
} from '@/lib/db/queries'
import type { BookingWithHolds } from '@/lib/db/queries'
import { getServerSession } from '@/lib/auth/server'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { getCachedSiteSettings } from '@/lib/site-settings/get'

type Props = { params: Promise<{ locale: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'booking.reconsider.meta' })
  return pageMetadata({
    locale,
    path: '/booking/reconsider',
    title: t('title'),
    description: t('description'),
  })
}

export default async function BookingReconsiderRoute({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const [reconsider, session, settings] = await Promise.all([
    getReconsiderCourse().catch((err) => {
      console.error('[booking/reconsider] getReconsiderCourse', err)
      return null as BookingWithHolds | null
    }),
    getServerSession().catch(() => null),
    getCachedSiteSettings(),
  ])

  // Reconsider may legitimately be absent (no active cohort configured); in
  // that case there's nothing to render — 404 rather than show a hollow
  // shell. The sub-nav chip on other booking routes still surfaces the
  // section (without the open-dot), so users can come back when a cohort
  // is added.
  if (!reconsider) {
    notFound()
  }

  const paidBookingIds = session
    ? await getPaidBookingIdsForUser(session.user.id).catch((err) => {
        console.error('[booking/reconsider] getPaidBookingIdsForUser', err)
        return [] as string[]
      })
    : []

  return (
    <ReconsiderPageClient
      reconsider={reconsider}
      hasSession={!!session}
      isAlreadyBooked={paidBookingIds.includes(reconsider.id)}
      allowGifting={settings.gifts.allow_user_to_user}
    />
  )
}
