import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { TourForm } from '@/components/admin/TourForm'
import { getTourById } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function EditBookingTourPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const tour = await getTourById(id)
  if (!tour) notFound()

  return <TourForm mode="edit" tourId={tour.id} initialValues={{
    slug: tour.slug,
    titleAr: tour.titleAr,
    titleEn: tour.titleEn,
    cityAr: tour.cityAr,
    cityEn: tour.cityEn,
    countryAr: tour.countryAr,
    countryEn: tour.countryEn,
    regionAr: tour.regionAr ?? '',
    regionEn: tour.regionEn ?? '',
    // datetime-local input wants `YYYY-MM-DDTHH:mm` (local time, no tz).
    // Drop the seconds + Z by slicing the ISO string.
    date: toLocalDateTimeInput(tour.date),
    venueAr: tour.venueAr ?? '',
    venueEn: tour.venueEn ?? '',
    descriptionAr: tour.descriptionAr ?? '',
    descriptionEn: tour.descriptionEn ?? '',
    externalBookingUrl: tour.externalBookingUrl ?? '',
    coverImage: tour.coverImage ?? '',
    attendedCount: tour.attendedCount,
    isActive: tour.isActive,
    displayOrder: tour.displayOrder,
  }} />
}

// Convert a Date to the format datetime-local inputs expect.
// `2026-03-15T18:30` (no seconds, no Z, local zone). Drizzle stored UTC; we
// surface it as the admin's wall clock so what they see matches what they
// typed when creating. The submit handler converts back to ISO via `new Date`.
function toLocalDateTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}
