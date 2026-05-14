import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SessionsPageClient } from '@/components/booking/SessionsPageClient'
import {
  getActiveOnlineSessions,
  getPaidBookingIdsForUser,
} from '@/lib/db/queries'
import type { BookingWithHolds } from '@/lib/db/queries'
import { getServerSession } from '@/lib/auth/server'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { getCachedSiteSettings } from '@/lib/site-settings/get'

type Props = { params: Promise<{ locale: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'booking.sessions.meta' })
  return pageMetadata({
    locale,
    path: '/booking/sessions',
    title: t('title'),
    description: t('description'),
  })
}

export default async function BookingSessionsRoute({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const [sessions, session, settings] = await Promise.all([
    getActiveOnlineSessions().catch((err) => {
      console.error('[booking/sessions] getActiveOnlineSessions', err)
      return [] as BookingWithHolds[]
    }),
    getServerSession().catch(() => null),
    getCachedSiteSettings(),
  ])

  const paidBookingIds = session
    ? await getPaidBookingIdsForUser(session.user.id).catch((err) => {
        console.error('[booking/sessions] getPaidBookingIdsForUser', err)
        return [] as string[]
      })
    : []

  return (
    <SessionsPageClient
      sessions={sessions}
      hasSession={!!session}
      paidBookingIds={paidBookingIds}
      allowGifting={settings.gifts.allow_user_to_user}
    />
  )
}
