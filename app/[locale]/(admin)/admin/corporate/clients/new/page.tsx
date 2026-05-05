import { setRequestLocale } from 'next-intl/server'
import { CorporateClientForm } from '@/components/admin/CorporateClientForm'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function NewCorporateClientPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <CorporateClientForm mode="create" />
}
