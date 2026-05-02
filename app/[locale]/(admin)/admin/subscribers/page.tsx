import { setRequestLocale } from 'next-intl/server'
import { SubscribersPanel } from '@/components/admin/SubscribersPanel'
import { getSubscribers } from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminSubscribersPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const subscribers = await getSubscribers(500)
  return <SubscribersPanel subscribers={subscribers} />
}
