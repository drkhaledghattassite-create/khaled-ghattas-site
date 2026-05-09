import { setRequestLocale } from 'next-intl/server'
import { BookingForm } from '@/components/admin/BookingForm'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function NewBookingPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <BookingForm mode="create" />
}
