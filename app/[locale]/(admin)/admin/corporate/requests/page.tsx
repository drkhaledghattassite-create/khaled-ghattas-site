import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CorporateRequestsTable } from '@/components/admin/CorporateRequestsTable'
import {
  getCorporatePrograms,
  getCorporateRequests,
} from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminCorporateRequestsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.corporate_requests')

  const [requests, programs] = await Promise.all([
    getCorporateRequests(),
    getCorporatePrograms({ publishedOnly: false }),
  ])

  if (requests.length === 0) {
    return (
      <div className="space-y-5">
        <p className="text-[13px] text-fg3">{t('description')}</p>
        <div className="rounded-md border border-dashed border-border bg-bg-elevated p-10 text-center">
          <p className="m-0 text-[14px] text-fg3 font-display">{t('empty')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-fg3">{t('description')}</p>
      <CorporateRequestsTable
        requests={requests}
        programs={programs}
        locale={locale}
      />
    </div>
  )
}
