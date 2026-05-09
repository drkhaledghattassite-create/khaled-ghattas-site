import { setRequestLocale } from 'next-intl/server'
import { TourForm } from '@/components/admin/TourForm'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function NewBookingTourPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <TourForm mode="create" />
}
