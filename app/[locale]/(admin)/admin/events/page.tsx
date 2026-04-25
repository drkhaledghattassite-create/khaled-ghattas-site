import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { EventsTable } from '@/components/admin/EventsTable'
import { getPastEvents, getUpcomingEvents } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminEventsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.events')
  const [upcoming, past] = await Promise.all([getUpcomingEvents(), getPastEvents()])
  const events = [...upcoming, ...past]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted">{t('description')}</p>
        <Link
          href="/admin/events/new"
          className="font-label inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink bg-ink px-4 py-2 text-[12px] text-cream-soft hover:bg-transparent hover:text-ink"
          style={{ letterSpacing: '0.08em' }}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('add')}
        </Link>
      </div>
      <EventsTable events={events} />
    </div>
  )
}
