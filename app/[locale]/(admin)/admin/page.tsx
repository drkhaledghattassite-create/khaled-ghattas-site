import { BookOpen, FileText, Plus, ShoppingCart, Wallet } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { AdminHomeKpiCards } from '@/components/admin/AdminHomeKpiCards'
import { StatCard } from '@/components/admin/StatCard'
import { StatusBadge } from '@/components/admin/StatusBadge'
import {
  RevenueChart,
  SubscribersChart,
} from '@/components/admin/AdminCharts'
import {
  countQueueByStatus,
  getArticles,
  getBooks,
  getContactMessages,
  getNewCorporateRequestCount,
  getNewSubscribersByDay,
  getOrderStats,
  getPendingBookingInterestCount,
  getPendingGiftCountExpiringWithin,
  getPendingQuestionCount,
  getRecentOrders,
  getRevenueByDay,
} from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'


type Props = { params: Promise<{ locale: string }> }

export default async function AdminHomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.dashboard')

  // Two real time-series fetched in parallel with the rest of the dashboard
  // data. Views chart was removed — articles.viewCount is a running total
  // with no per-day record, so a daily-buckets chart there would be fake.
  // KPI counts are read here (instead of the sidebar's already-aggregated
  // ones from the layout) so they stay in lockstep with the cards even
  // after a router.refresh — and so adding new metrics doesn't require
  // threading more props through the layout.
  const [
    articles,
    books,
    stats,
    orders,
    messages,
    revenueSeries,
    subscriberSeries,
    pendingQuestions,
    pendingInterest,
    expiringGifts,
    newCorporateRequests,
    queueCounts,
  ] = await Promise.all([
    getArticles(),
    getBooks(),
    getOrderStats(),
    getRecentOrders(10),
    getContactMessages('UNREAD', 5),
    getRevenueByDay(30),
    getNewSubscribersByDay(30),
    getPendingQuestionCount().catch(() => 0),
    getPendingBookingInterestCount().catch(() => 0),
    getPendingGiftCountExpiringWithin(7).catch(() => 0),
    getNewCorporateRequestCount().catch(() => 0),
    countQueueByStatus().catch(() => ({
      PENDING: 0,
      SENDING: 0,
      SENT: 0,
      FAILED: 0,
      EXHAUSTED: 0,
    })),
  ])
  const emailQueueAttention = queueCounts.EXHAUSTED + queueCounts.FAILED

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Fake placeholder deltas removed (2026-05-02). When real period-over-period
            analytics land, pass the computed delta back in. */}
        <StatCard label={t('stats.articles')} value={articles.length} icon={FileText} />
        <StatCard label={t('stats.books')} value={books.length} icon={BookOpen} />
        <StatCard label={t('stats.orders')} value={stats.orderCount} icon={ShoppingCart} />
        <StatCard
          label={t('stats.revenue')}
          value={`$${stats.totalRevenue.toFixed(2)}`}
          icon={Wallet}
        />
      </div>

      <AdminHomeKpiCards
        pendingQuestions={pendingQuestions}
        pendingInterest={pendingInterest}
        expiringGifts={expiringGifts}
        newCorporateRequests={newCorporateRequests}
        emailQueueAttention={emailQueueAttention}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPanel heading={t('charts.revenue')}>
          <RevenueChart data={revenueSeries} />
        </ChartPanel>
        <ChartPanel heading={t('charts.subscribers')}>
          <SubscribersChart data={subscriberSeries} />
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel heading={t('recent_orders')}>
          {orders.length === 0 ? (
            <p className="text-[12px] text-fg3">{t('empty.orders')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2">
                  <div className="flex flex-col leading-tight">
                    <span className="font-label text-[12px] text-fg1">{o.customerEmail}</span>
                    <span className="text-[10px] text-fg3">
                      {o.createdAt.toISOString().slice(0, 10)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-fg1 font-display font-medium text-[13px]">
                      ${o.totalAmount}
                    </span>
                    <StatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel heading={t('recent_messages')}>
          {messages.length === 0 ? (
            <p className="text-[12px] text-fg3">{t('empty.messages')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {messages.map((m) => (
                <li key={m.id} className="py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-label text-[12px] text-fg1">{m.email}</span>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="mt-1 truncate text-[12px] text-fg3">{m.subject}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel heading={t('quick_actions')}>
          <ul className="space-y-2">
            <QuickActionLink href="/admin/articles/new" label={t('quick.new_article')} />
            <QuickActionLink href="/admin/books/new" label={t('quick.new_book')} />
            <QuickActionLink href="/admin/events/new" label={t('quick.new_event')} />
            <QuickActionLink href="/admin/messages" label={t('quick.review_messages')} />
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function Panel({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-dashed border-border bg-bg-elevated p-5">
      <h2 className="mb-3 text-fg1 font-display font-semibold text-[14px] tracking-[0.04em] uppercase">
        {heading}
      </h2>
      {children}
    </section>
  )
}

function ChartPanel({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-dashed border-border bg-bg-elevated p-5">
      <h2 className="mb-3 text-fg1 font-display font-semibold text-[14px] tracking-[0.04em] uppercase">
        {heading}
      </h2>
      <div className="-mx-2">{children}</div>
    </section>
  )
}

function QuickActionLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      {/* Hover state uses --color-accent (Sienna Ink) on the soft fill, matching
          the rest of admin's accent affordance. */}
      <Link
        href={href}
        className="font-label group flex items-center justify-between gap-2 rounded border border-dashed border-border px-3 py-2 text-[12px] text-fg1 transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
      >
        <span>{label}</span>
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </li>
  )
}
