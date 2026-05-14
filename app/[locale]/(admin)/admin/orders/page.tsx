import { setRequestLocale } from 'next-intl/server'
import { AdminOrdersListPage } from '@/components/admin/orders/AdminOrdersListPage'
import { getAdminOrders } from '@/lib/db/queries'
import type { OrderStatus } from '@/lib/db/schema'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
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
  // Accept YYYY-MM-DD; reject malformed input rather than letting Date()
  // parse "" → Invalid Date and bubble NaN through SQL.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const d = new Date(`${raw}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

export default async function AdminOrdersPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams

  const status = readStatus(sp.status)
  const search = (sp.search ?? '').trim()
  const startDate = readDate(sp.start)
  // End date is inclusive: bump to end-of-day so an `end=2026-05-01` query
  // includes orders created at any timestamp on 2026-05-01.
  const endDateRaw = readDate(sp.end)
  const endDate = endDateRaw
    ? new Date(endDateRaw.getTime() + 24 * 60 * 60 * 1000 - 1)
    : null
  const page = Number.parseInt(sp.page ?? '1', 10) || 1

  const data = await getAdminOrders({
    status,
    search: search || undefined,
    startDate,
    endDate,
    page,
    pageSize: 50,
  })

  return (
    <AdminOrdersListPage
      rows={data.rows.map((o) => ({
        id: o.id,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        totalAmount: o.totalAmount,
        currency: o.currency,
        status: o.status,
        stripeSessionId: o.stripeSessionId,
        createdAt: o.createdAt.toISOString(),
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
  )
}
