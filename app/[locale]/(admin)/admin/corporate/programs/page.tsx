import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { CorporateProgramsTable } from '@/components/admin/CorporateProgramsTable'
import { getCorporatePrograms } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminCorporateProgramsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.corporate_programs')

  const programs = await getCorporatePrograms({ publishedOnly: false })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg3">{t('description')}</p>
        <Link href="/admin/corporate/programs/new" className="btn-pill btn-pill-primary">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('add')}
        </Link>
      </div>
      <CorporateProgramsTable programs={programs} />
    </div>
  )
}
