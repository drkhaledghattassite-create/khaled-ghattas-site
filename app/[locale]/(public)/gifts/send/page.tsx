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

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

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

function normaliseType(raw: string | string[] | undefined): 'book' | 'session' | 'booking' | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === 'book' || value === 'session' || value === 'booking') return value
  return null
}

function normaliseId(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return null
  // Cheap UUID-shape guard — the SendGiftPage falls back gracefully if no
  // match is found, but we don't want to ship arbitrary strings into the
  // client component's state.
  if (!/^[0-9a-f-]{8,40}$/i.test(value)) return null
  return value
}

export default async function GiftsSendRoute({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams

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

  const preselectedType = normaliseType(sp.type)
  const preselectedId = normaliseId(sp.id)
  const cancelled = sp.cancelled === '1'

  return (
    <SendGiftPage
      locale={locale}
      books={books}
      sessions={sessions}
      bookings={bookings}
      isLoggedIn={!!session}
      featureEnabled={settings.gifts.allow_user_to_user}
      preselectedType={preselectedType}
      preselectedId={preselectedId}
      cancelled={cancelled}
    />
  )
}
