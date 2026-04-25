import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { EventForm } from '@/components/admin/EventForm'
import { getPastEvents, getUpcomingEvents } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function EditEventPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const events = [...(await getUpcomingEvents()), ...(await getPastEvents())]
  const event = events.find((e) => e.id === id)
  if (!event) notFound()

  return (
    <EventForm
      mode="edit"
      eventId={event.id}
      initialValues={{
        slug: event.slug,
        titleAr: event.titleAr,
        titleEn: event.titleEn,
        descriptionAr: event.descriptionAr,
        descriptionEn: event.descriptionEn,
        locationAr: event.locationAr ?? '',
        locationEn: event.locationEn ?? '',
        coverImage: event.coverImage ?? '',
        startDate: event.startDate,
        endDate: event.endDate,
        registrationUrl: event.registrationUrl ?? '',
        status: event.status,
        orderIndex: event.orderIndex,
      }}
    />
  )
}
