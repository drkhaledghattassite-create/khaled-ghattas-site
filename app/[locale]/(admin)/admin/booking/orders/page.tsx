import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AdminBookingOrdersListPage } from '@/components/admin/booking/AdminBookingOrdersListPage'
import { BookingOrdersPurgeButton } from '@/components/admin/BookingOrdersPurgeButton'
import { getAdminBookingOrders } from '@/lib/db/queries'
import type { OrderStatus } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    status?: string
    search?: string
    start?: string
    end?: string
    page?: string
  }>
}

const STATUS_VALUES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'FULFILLED',
  'REFUNDED',
  'FAILED',
]

function readStatus(raw: string | undefined): OrderStatus | 'all' {
  if (raw && (STATUS_VALUES as string[]).includes(raw)) {
    return raw as OrderStatus
  }
  return 'all'
}

function readDate(raw: string | undefined): Date | null {
  if (!raw) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const d = new Date(`${raw}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

export default async function AdminBookingOrdersPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.booking_orders')
  const sp = await searchParams

  const status = readStatus(sp.status)
  const search = (sp.search ?? '').trim()
  const startDate = readDate(sp.start)
  const endDateRaw = readDate(sp.end)
  const endDate = endDateRaw
    ? new Date(endDateRaw.getTime() + 24 * 60 * 60 * 1000 - 1)
    : null
  const page = Number.parseInt(sp.page ?? '1', 10) || 1

  const data = await getAdminBookingOrders({
    status,
    search: search || undefined,
    startDate,
    endDate,
    page,
    pageSize: 50,
  })

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="m-0 text-[clamp(20px,2.4vw,26px)] font-bold tracking-[-0.005em] text-fg1 font-display">
            {t('page_title')}
          </h1>
          <p className="m-0 max-w-[60ch] text-[13px] text-fg3 font-display rtl:font-arabic-body">
            {t('page_description')}
          </p>
        </div>
        <BookingOrdersPurgeButton />
      </header>

      <AdminBookingOrdersListPage
        rows={data.rows.map((o) => ({
          id: o.id,
          createdAt: o.createdAt.toISOString(),
          confirmedAt: o.confirmedAt?.toISOString() ?? null,
          status: o.status,
          amountPaid: o.amountPaid,
          currency: o.currency,
          stripeSessionId: o.stripeSessionId,
          stripePaymentIntentId: o.stripePaymentIntentId,
          userEmail: o.userEmail,
          userName: o.userName,
          bookingTitleAr: o.bookingTitleAr,
          bookingTitleEn: o.bookingTitleEn,
          bookingProductType: o.bookingProductType,
          giftId: o.giftId,
        }))}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        locale={locale === 'ar' ? 'ar' : 'en'}
        initialFilter={{
          status,
          search: sp.search ?? '',
          start: sp.start ?? '',
          end: sp.end ?? '',
        }}
      />
    </div>
  )
}
