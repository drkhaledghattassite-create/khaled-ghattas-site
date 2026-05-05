import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { CorporateClientsTable } from '@/components/admin/CorporateClientsTable'
import { getCorporateClients } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminCorporateClientsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.corporate_clients')

  const clients = await getCorporateClients({ publishedOnly: false })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg3">{t('description')}</p>
        <Link href="/admin/corporate/clients/new" className="btn-pill btn-pill-primary">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('add')}
        </Link>
      </div>
      <CorporateClientsTable clients={clients} />
    </div>
  )
}
