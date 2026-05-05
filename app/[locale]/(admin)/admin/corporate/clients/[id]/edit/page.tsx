import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { CorporateClientForm } from '@/components/admin/CorporateClientForm'
import { getCorporateClient } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function EditCorporateClientPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const client = await getCorporateClient(id)
  if (!client) notFound()

  return (
    <CorporateClientForm
      mode="edit"
      clientId={client.id}
      initialValues={{
        name: client.name,
        nameAr: client.nameAr ?? '',
        logoUrl: client.logoUrl,
        websiteUrl: client.websiteUrl ?? '',
        status: client.status,
        orderIndex: client.orderIndex,
      }}
    />
  )
}
