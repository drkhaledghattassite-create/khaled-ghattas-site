import { setRequestLocale } from 'next-intl/server'
import { SubscribersPanel } from '@/components/admin/SubscribersPanel'
import { getSubscribers } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminSubscribersPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const subscribers = await getSubscribers(500)
  return <SubscribersPanel subscribers={subscribers} />
}
