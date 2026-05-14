import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CorporateRequestsTable } from '@/components/admin/CorporateRequestsTable'
import { CorporateRequestsFunnel } from '@/components/admin/CorporateRequestsFunnel'
import {
  getAdminCorporateRequests,
  getCorporatePrograms,
  getCorporateRequestFunnel,
} from '@/lib/db/queries'
import type { CorporateRequestStatus } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    status?: string
    search?: string
    page?: string
  }>
}

const STATUS_VALUES: CorporateRequestStatus[] = [
  'NEW',
  'CONTACTED',
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
]

function readStatus(raw: string | undefined): CorporateRequestStatus | 'all' {
  if (raw && (STATUS_VALUES as string[]).includes(raw)) {
    return raw as CorporateRequestStatus
  }
  return 'all'
}

export default async function AdminCorporateRequestsPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.corporate_requests')
  const sp = await searchParams

  const status = readStatus(sp.status)
  const search = (sp.search ?? '').trim()
  const page = Number.parseInt(sp.page ?? '1', 10) || 1

  // Funnel is computed across the FULL data set (not the filtered view) so
  // the conversion numbers stay meaningful even after admin filters the list
  // by status. Loaded in parallel with the page slice.
  const [data, programs, funnel] = await Promise.all([
    getAdminCorporateRequests({
      status,
      search: search || undefined,
      page,
      pageSize: 50,
    }),
    getCorporatePrograms({ publishedOnly: false }),
    getCorporateRequestFunnel(),
  ])

  if (data.total === 0 && status === 'all' && !search) {
    return (
      <div className="space-y-5">
        <p className="text-[13px] text-fg3">{t('description')}</p>
        <CorporateRequestsFunnel funnel={funnel} />
        <div className="rounded-md border border-dashed border-border bg-bg-elevated p-10 text-center">
          <p className="m-0 text-[14px] text-fg3 font-display">{t('empty')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-fg3">{t('description')}</p>
      <CorporateRequestsFunnel funnel={funnel} />
      <CorporateRequestsTable
        requests={data.rows}
        programs={programs}
        locale={locale}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        initialFilter={{ status, search: sp.search ?? '' }}
      />
    </div>
  )
}
