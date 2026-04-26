import { BookOpen, FileText, Plus, ShoppingCart, Wallet } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { StatCard } from '@/components/admin/StatCard'
import { StatusBadge } from '@/components/admin/StatusBadge'
import {
  RevenueChart,
  SubscribersChart,
  ViewsChart,
} from '@/components/admin/AdminCharts'
import {
  getArticles,
  getBooks,
  getOrderStats,
  getRecentOrders,
  getContactMessages,
} from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminHomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.dashboard')

  const [articles, books, stats, orders, messages] = await Promise.all([
    getArticles(),
    getBooks(),
    getOrderStats(),
    getRecentOrders(10),
    getContactMessages('UNREAD', 5),
  ])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('stats.articles')} value={articles.length} delta={12} icon={FileText} />
        <StatCard label={t('stats.books')} value={books.length} delta={4} icon={BookOpen} />
        <StatCard label={t('stats.orders')} value={stats.orderCount} delta={0} icon={ShoppingCart} />
        <StatCard
          label={t('stats.revenue')}
          value={`$${stats.totalRevenue.toFixed(2)}`}
          delta={8}
          icon={Wallet}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartPanel heading={t('charts.revenue')}>
          <RevenueChart />
        </ChartPanel>
        <ChartPanel heading={t('charts.views')}>
          <ViewsChart />
        </ChartPanel>
        <ChartPanel heading={t('charts.subscribers')}>
          <SubscribersChart />
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel heading={t('recent_orders')}>
          {orders.length === 0 ? (
            <p className="text-[12px] text-ink-muted">{t('empty.orders')}</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2">
                  <div className="flex flex-col leading-tight">
                    <span className="font-label text-[12px] text-ink">{o.customerEmail}</span>
                    <span className="text-[10px] text-ink-muted">
                      {o.createdAt.toISOString().slice(0, 10)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-ink font-display font-medium text-[13px]"
                    >
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
            <p className="text-[12px] text-ink-muted">{t('empty.messages')}</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {messages.map((m) => (
                <li key={m.id} className="py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-label text-[12px] text-ink">{m.email}</span>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="mt-1 truncate text-[12px] text-ink-muted">{m.subject}</p>
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
    <section className="rounded-md border border-dashed border-ink/30 bg-cream-soft p-5">
      <h2
        className="mb-3 text-ink font-display font-semibold text-[14px] tracking-[0.04em] uppercase"
      >
        {heading}
      </h2>
      {children}
    </section>
  )
}

function ChartPanel({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-dashed border-ink/30 bg-cream-soft p-5">
      <h2
        className="mb-3 text-ink font-display font-semibold text-[14px] tracking-[0.04em] uppercase"
      >
        {heading}
      </h2>
      <div className="-mx-2">{children}</div>
    </section>
  )
}

function QuickActionLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="font-label group flex items-center justify-between gap-2 rounded border border-dashed border-ink/30 px-3 py-2 text-[12px] text-ink transition-colors hover:border-amber hover:bg-amber/10 hover:text-amber"
      >
        <span>{label}</span>
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </li>
  )
}
