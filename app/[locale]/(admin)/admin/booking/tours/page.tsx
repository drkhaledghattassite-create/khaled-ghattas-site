import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { ToursAdminTable } from '@/components/admin/ToursAdminTable'
import { getAllToursAdmin } from '@/lib/db/queries'
import { resolvePublicUrl } from '@/lib/storage/public-url'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminBookingToursPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.booking_tours')

  const tours = await getAllToursAdmin()

  // Phase F2 gap-fix — resolve cover storage keys server-side so
  // ToursAdminTable can render straight to <Image>. coverImage is nullable
  // on tours, so preserve null when resolution returns null.
  const resolvedTours = await Promise.all(
    tours.map(async (tour) => ({
      ...tour,
      coverImage: tour.coverImage
        ? ((await resolvePublicUrl(tour.coverImage)) ?? tour.coverImage)
        : tour.coverImage,
    })),
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg3">{t('page_description')}</p>
        <Link href="/admin/booking/tours/new" className="btn-pill btn-pill-primary">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('add')}
        </Link>
      </div>
      <ToursAdminTable tours={resolvedTours} />
    </div>
  )
}
