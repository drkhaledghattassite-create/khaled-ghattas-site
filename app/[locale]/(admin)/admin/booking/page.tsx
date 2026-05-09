import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  Heart,
  Lightbulb,
  MapPin,
} from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import {
  getAllBookingInterest,
  getAllBookingOrders,
  getAllBookingsAdmin,
  getAllToursAdmin,
  getAllTourSuggestions,
} from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminBookingOverviewPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.booking_overview')

  // Five surface-counts fetched in parallel. Each helper returns [] (not
  // throws) when DATABASE_URL is unset, so the cards just show 0.
  const [tours, bookings, suggestions, interest, orders] = await Promise.all([
    getAllToursAdmin(),
    getAllBookingsAdmin(),
    getAllTourSuggestions(),
    getAllBookingInterest(),
    getAllBookingOrders(),
  ])

  const pendingSuggestions = suggestions.filter((s) => s.reviewedAt === null)
    .length
  const pendingInterest = interest.filter((i) => i.contactedAt === null).length
  const paidOrders = orders.filter((o) => o.status === 'PAID').length

  const cards = [
    {
      icon: MapPin,
      label: t('stats_tours'),
      value: tours.length,
      href: '/admin/booking/tours',
      cta: t('go_tours'),
    },
    {
      icon: CalendarDays,
      label: t('stats_bookings'),
      value: bookings.length,
      href: '/admin/booking/bookings',
      cta: t('go_bookings'),
    },
    {
      icon: Lightbulb,
      label: t('stats_suggestions_pending'),
      value: pendingSuggestions,
      href: '/admin/booking/tour-suggestions',
      cta: t('go_suggestions'),
    },
    {
      icon: Heart,
      label: t('stats_interest_pending'),
      value: pendingInterest,
      href: '/admin/booking/interest',
      cta: t('go_interest'),
    },
    {
      icon: CreditCard,
      label: t('stats_orders_paid'),
      value: paidOrders,
      href: '/admin/booking/orders',
      cta: t('go_orders'),
    },
  ] as const

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="m-0 text-[clamp(20px,2.4vw,26px)] font-bold tracking-[-0.005em] text-fg1 font-display">
          {t('page_title')}
        </h1>
        <p className="m-0 max-w-[60ch] text-[13px] text-fg3 font-display rtl:font-arabic-body">
          {t('description')}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col gap-3 rounded-md border border-border bg-bg-elevated p-5 transition-[border-color,box-shadow] hover:border-fg2 hover:[box-shadow:var(--shadow-card)]"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-[28px] font-semibold tabular-nums text-fg1 num-latn font-display">
                  {c.value}
                </span>
              </div>
              <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.1em] text-fg3 font-display">
                {c.label}
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-[12px] font-semibold text-fg1 font-display">
                {c.cta}
                <ArrowRight
                  aria-hidden
                  className="h-3 w-3 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:!-translate-x-0.5"
                />
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
