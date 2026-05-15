import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { CorporateClientsTable } from '@/components/admin/CorporateClientsTable'
import { getCorporateClients } from '@/lib/db/queries'
import { resolvePublicUrl } from '@/lib/storage/public-url'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminCorporateClientsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.corporate_clients')

  const clients = await getCorporateClients({ publishedOnly: false })

  // Phase F2 — resolve client logo storage keys server-side. The CorporateClient
  // image field is `logoUrl` (not coverImage). Mirrors the public /corporate
  // page's resolve pattern. `logoUrl` is schema-NOT-NULL; preserve the original
  // on resolution failure.
  const resolvedClients = await Promise.all(
    clients.map(async (c) => ({
      ...c,
      logoUrl: (await resolvePublicUrl(c.logoUrl)) ?? c.logoUrl,
    })),
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg3">{t('description')}</p>
        <Link href="/admin/corporate/clients/new" className="btn-pill btn-pill-primary">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('add')}
        </Link>
      </div>
      <CorporateClientsTable clients={resolvedClients} />
    </div>
  )
}
