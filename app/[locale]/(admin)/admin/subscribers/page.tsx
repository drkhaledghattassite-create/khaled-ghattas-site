import { setRequestLocale } from 'next-intl/server'
import { SubscribersPanel } from '@/components/admin/SubscribersPanel'
import { getAdminSubscribers } from '@/lib/db/queries'
import type { SubscriberStatus } from '@/lib/db/schema'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    status?: string
    search?: string
    page?: string
  }>
}

const STATUS_VALUES: SubscriberStatus[] = ['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED']

function readStatus(raw: string | undefined): SubscriberStatus | 'all' {
  if (raw && (STATUS_VALUES as string[]).includes(raw)) {
    return raw as SubscriberStatus
  }
  return 'all'
}

export default async function AdminSubscribersPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams

  const status = readStatus(sp.status)
  const search = (sp.search ?? '').trim()
  const page = Number.parseInt(sp.page ?? '1', 10) || 1

  const data = await getAdminSubscribers({
    status,
    search: search || undefined,
    page,
    pageSize: 50,
  })

  return (
    <SubscribersPanel
      rows={data.rows}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
      initialFilter={{ status, search: sp.search ?? '' }}
    />
  )
}
