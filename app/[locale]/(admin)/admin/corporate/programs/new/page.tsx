import { setRequestLocale } from 'next-intl/server'
import { CorporateProgramForm } from '@/components/admin/CorporateProgramForm'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function NewCorporateProgramPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <CorporateProgramForm mode="create" />
}
