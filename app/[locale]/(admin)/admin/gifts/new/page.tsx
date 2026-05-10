import { setRequestLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { AdminGiftCreatePage } from '@/components/admin/gifts/AdminGiftCreatePage'
import {
  getActiveOnlineSessions,
  getBooks,
  getReconsiderCourse,
} from '@/lib/db/queries'
import type { Book, BookingWithHolds } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminGiftNewRoute({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.gifts.create')

  const [allBooks, reconsider, onlineSessions] = await Promise.all([
    getBooks({ limit: 100 }).catch((err) => {
      console.error('[admin/gifts/new] getBooks', err)
      return [] as Book[]
    }),
    getReconsiderCourse().catch((err) => {
      console.error('[admin/gifts/new] getReconsiderCourse', err)
      return null as BookingWithHolds | null
    }),
    getActiveOnlineSessions().catch((err) => {
      console.error('[admin/gifts/new] getActiveOnlineSessions', err)
      return [] as BookingWithHolds[]
    }),
  ])

  const books = allBooks.filter((b) => b.productType === 'BOOK')
  const sessions = allBooks.filter((b) => b.productType === 'SESSION')
  const bookings = [
    ...(reconsider ? [reconsider] : []),
    ...onlineSessions.filter((b) => b.bookingState === 'OPEN'),
  ]

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/gifts"
          className="text-[13px] text-[var(--color-fg3)] hover:text-[var(--color-fg2)]"
        >
          ← {t('back_cta')}
        </Link>
      </div>
      <AdminGiftCreatePage
        locale={locale === 'ar' ? 'ar' : 'en'}
        books={books}
        sessions={sessions}
        bookings={bookings}
      />
    </div>
  )
}
