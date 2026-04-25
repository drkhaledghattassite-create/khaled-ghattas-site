import { setRequestLocale } from 'next-intl/server'
import { EventForm } from '@/components/admin/EventForm'

type Props = { params: Promise<{ locale: string }> }

export default async function NewEventPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <EventForm mode="create" />
}
