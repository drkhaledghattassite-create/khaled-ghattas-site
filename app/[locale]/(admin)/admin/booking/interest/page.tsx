import { getTranslations, setRequestLocale } from 'next-intl/server'
import { BookingInterestTable } from '@/components/admin/BookingInterestTable'
import { getAllBookingInterest } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminBookingInterestPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.booking_interest')

  const interests = await getAllBookingInterest()

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="m-0 text-[clamp(20px,2.4vw,26px)] font-bold tracking-[-0.005em] text-fg1 font-display">
          {t('page_title')}
        </h1>
        <p className="m-0 max-w-[60ch] text-[13px] text-fg3 font-display rtl:font-arabic-body">
          {t('page_description')}
        </p>
      </header>

      {interests.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-bg-elevated p-10 text-center">
          <p className="m-0 text-[14px] text-fg3 font-display">
            {t('empty_title')}
          </p>
        </div>
      ) : (
        <BookingInterestTable interests={interests} />
      )}
    </div>
  )
}
