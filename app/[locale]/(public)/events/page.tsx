import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InnerHero } from '@/components/shared/InnerHero'
import { EventsTimeline } from '@/components/sections/EventsTimeline'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { EventJsonLd } from '@/components/seo/StructuredData'
import { getPastEvents, getUpcomingEvents } from '@/lib/db/queries'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { getCachedSiteSettings } from '@/lib/site-settings/get'

type Props = { params: Promise<{ locale: string }> }

// High-traffic ISR — see /books/page.tsx for rationale. 30 min revalidate.
export const revalidate = 1800

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'events.meta' })
  return pageMetadata({
    locale,
    path: '/events',
    title: t('title'),
    description: t('description'),
  })
}

export default async function EventsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const settings = await getCachedSiteSettings()
  if (settings.coming_soon_pages.includes('events')) {
    return <ComingSoon pageKey="events" />
  }

  const t = await getTranslations('events')
  const [upcoming, past] = await Promise.all([getUpcomingEvents(), getPastEvents()])

  return (
    <>
      {[...upcoming, ...past].map((event) => (
        <EventJsonLd key={event.id} event={event} locale={locale} />
      ))}
      <InnerHero
        eyebrow={t('page.eyebrow')}
        headingItalic={t('page.hero.italic')}
        headingSans={t('page.hero.sans')}
        description={t('page.description')}
      />
      <EventsTimeline
        upcoming={upcoming}
        past={past}
        upcomingLabel={t('upcoming')}
        pastLabel={t('past')}
        registerLabel={t('register')}
      />
    </>
  )
}
