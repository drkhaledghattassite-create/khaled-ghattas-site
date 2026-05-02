import { getTranslations, setRequestLocale } from 'next-intl/server'
import { OrdersTable } from '@/components/admin/OrdersTable'
import { getRecentOrders } from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminOrdersPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.orders')
  const orders = await getRecentOrders(50)

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-fg3">{t('description')}</p>
      <OrdersTable orders={orders} />
    </div>
  )
}
