import { getTranslations, setRequestLocale } from 'next-intl/server'
import { OrdersTable } from '@/components/admin/OrdersTable'
import { getRecentOrders } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminOrdersPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.orders')
  const orders = await getRecentOrders(50)

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-ink-muted">{t('description')}</p>
      <OrdersTable orders={orders} />
    </div>
  )
}
