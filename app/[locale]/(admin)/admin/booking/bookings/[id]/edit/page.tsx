import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { BookingForm } from '@/components/admin/BookingForm'
import { BookingCapacityCard } from '@/components/admin/BookingCapacityCard'
import { getBookingById } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function EditBookingPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  // getBookingById always returns BookingWithHolds (activeHoldsCount included)
  // — there's no explicit option flag on the helper.
  const booking = await getBookingById(id)
  if (!booking) notFound()

  return (
    <div className="space-y-6">
      <BookingForm
        mode="edit"
        bookingId={booking.id}
        initialValues={{
          slug: booking.slug,
          productType: booking.productType,
          titleAr: booking.titleAr,
          titleEn: booking.titleEn,
          descriptionAr: booking.descriptionAr,
          descriptionEn: booking.descriptionEn,
          coverImage: booking.coverImage ?? '',
          priceUsd: booking.priceUsd,
          currency: booking.currency,
          nextCohortDate: booking.nextCohortDate
            ? toLocalDateTimeInput(booking.nextCohortDate)
            : '',
          cohortLabelAr: booking.cohortLabelAr ?? '',
          cohortLabelEn: booking.cohortLabelEn ?? '',
          durationMinutes: booking.durationMinutes,
          formatAr: booking.formatAr ?? '',
          formatEn: booking.formatEn ?? '',
          maxCapacity: booking.maxCapacity,
          bookingState: booking.bookingState,
          displayOrder: booking.displayOrder,
          isActive: booking.isActive,
        }}
      />
      <BookingCapacityCard
        bookingId={booking.id}
        title={booking.titleEn || booking.titleAr || booking.slug}
        maxCapacity={booking.maxCapacity}
        bookedCount={booking.bookedCount}
        activeHoldsCount={booking.activeHoldsCount}
        bookingState={booking.bookingState}
      />
    </div>
  )
}

function toLocalDateTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}
