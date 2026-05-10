import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SendGiftPage } from '@/components/gifts/SendGiftPage'
import {
  getActiveOnlineSessions,
  getBooks,
  getReconsiderCourse,
} from '@/lib/db/queries'
import type { Book, BookingWithHolds } from '@/lib/db/queries'
import { getServerSession } from '@/lib/auth/server'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { getCachedSiteSettings } from '@/lib/site-settings/get'

type Props = { params: Promise<{ locale: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'gifts.meta' })
  return pageMetadata({
    locale,
    path: '/gifts/send',
    title: t('send_title'),
    description: t('send_description'),
  })
}

export default async function GiftsSendRoute({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const settings = await getCachedSiteSettings()

  const [allBooks, reconsider, onlineSessions, session] = await Promise.all([
    getBooks({ limit: 100 }).catch((err) => {
      console.error('[gifts/send] getBooks', err)
      return [] as Book[]
    }),
    getReconsiderCourse().catch((err) => {
      console.error('[gifts/send] getReconsiderCourse', err)
      return null as BookingWithHolds | null
    }),
    getActiveOnlineSessions().catch((err) => {
      console.error('[gifts/send] getActiveOnlineSessions', err)
      return [] as BookingWithHolds[]
    }),
    getServerSession().catch(() => null),
  ])

  // Split BOOK vs SESSION using the productType column on books.
  const books = allBooks.filter((b) => b.productType === 'BOOK')
  const sessions = allBooks.filter((b) => b.productType === 'SESSION')
  const bookings = [
    ...(reconsider ? [reconsider] : []),
    ...onlineSessions.filter((b) => b.bookingState === 'OPEN'),
  ]

  return (
    <SendGiftPage
      locale={locale}
      books={books}
      sessions={sessions}
      bookings={bookings}
      isLoggedIn={!!session}
      featureEnabled={settings.gifts.allow_user_to_user}
    />
  )
}
