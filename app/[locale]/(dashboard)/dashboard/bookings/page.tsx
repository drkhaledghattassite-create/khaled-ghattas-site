import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import { getBookingOrdersByUserId } from '@/lib/db/queries'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import {
  BookingsList,
  type BookingsListItem,
} from '@/components/dashboard/BookingsList'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard_bookings' })
  return {
    title: t('title'),
    description: t('subtitle'),
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export default async function DashboardBookingsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getServerSession()
  if (!session) {
    redirect({ href: '/login', locale })
  }

  const t = await getTranslations({ locale, namespace: 'dashboard_bookings' })
  const isRtl = locale === 'ar'
  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-arabic-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  // Fail-closed: a slow / broken DB renders the empty state, never throws.
  const [orders, settings] = await Promise.all([
    getBookingOrdersByUserId(session!.user.id).catch(() => []),
    getCachedSiteSettings(),
  ])

  // Project to the locale-aware shape the list component renders. Drops
  // bilingual columns and keeps just what the UI needs.
  const items: BookingsListItem[] = orders.map((o) => ({
    id: o.id,
    title: locale === 'ar' ? o.bookingTitleAr : o.bookingTitleEn,
    cohortLabel: locale === 'ar' ? o.cohortLabelAr : o.cohortLabelEn,
    nextCohortDate: o.nextCohortDate?.toISOString() ?? null,
    format: locale === 'ar' ? o.formatAr : o.formatEn,
    amountPaid: o.amountPaid,
    currency: o.currency,
    status: o.status,
  }))

  return (
    <DashboardLayout
      activeTab="bookings"
      user={session!.user}
      dashboardSettings={settings.dashboard}
    >
      <header className="mb-6 flex flex-col gap-2">
        <h1
          className={`m-0 text-[clamp(22px,2.6vw,30px)] leading-[1.2] font-bold tracking-[-0.005em] text-[var(--color-fg1)] ${fontDisplay}`}
        >
          {t('title')}
        </h1>
        <p
          className={`m-0 max-w-[60ch] text-[14px] leading-[1.7] text-[var(--color-fg3)] ${fontBody}`}
        >
          {t('subtitle')}
        </p>
      </header>
      <BookingsList locale={locale === 'ar' ? 'ar' : 'en'} items={items} />
    </DashboardLayout>
  )
}
