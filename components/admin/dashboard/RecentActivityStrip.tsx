import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { StatusBadge } from '@/components/admin/StatusBadge'
import type {
  AdminQuestion,
  BookingOrderWithMeta,
} from '@/lib/db/queries'
import type { Order } from '@/lib/db/schema'

// Three-column activity feed: orders / bookings / questions. Each column
// shows up to 3 most-recent rows. Empty state is quiet text. Rows link to
// the appropriate detail or filtered list. Status pills delegated to the
// shared StatusBadge so a tone change anywhere in admin lands here too.

export async function RecentActivityStrip({
  locale,
  orders,
  bookingOrders,
  questions,
}: {
  locale: string
  orders: Order[]
  bookingOrders: BookingOrderWithMeta[]
  questions: AdminQuestion[]
}) {
  const t = await getTranslations({
    locale,
    namespace: 'admin.dashboard.activity',
  })
  const isAr = locale === 'ar'
  const currencyFmt = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-3">
      {/* Orders */}
      <article className="flex flex-col rounded-md border border-border bg-bg-elevated p-5">
        <header className="mb-1 flex items-baseline justify-between">
          <h3 className="font-display text-[15.5px] font-bold tracking-[-0.005em] text-fg1 rtl:font-arabic-display rtl:text-[17px] rtl:tracking-normal">
            {t('orders_heading')}
          </h3>
          <Link
            href="/admin/orders"
            className="text-[12px] text-fg3 transition-colors hover:text-accent"
          >
            {t('see_all_orders')}
          </Link>
        </header>
        {orders.length === 0 ? (
          <p className="mt-3 text-[12.5px] text-fg3">{t('empty')}</p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {orders.map((o, i) => (
              <li
                key={o.id}
                className={`flex flex-col gap-1 py-3 ${
                  i === 0 ? 'pt-1.5' : 'border-t border-border'
                }`}
              >
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="flex flex-col gap-1 transition-colors hover:text-accent"
                >
                  <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
                    <span className="min-w-0 truncate font-semibold text-fg1">
                      {o.customerName ?? o.customerEmail}
                    </span>
                    <span className="flex-none tabular-nums num-latn text-fg2">
                      {currencyFmt.format(Number(o.totalAmount))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[12.5px] text-fg3">
                    <span className="min-w-0 truncate">{o.customerEmail}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </article>

      {/* Bookings */}
      <article className="flex flex-col rounded-md border border-border bg-bg-elevated p-5">
        <header className="mb-1 flex items-baseline justify-between">
          <h3 className="font-display text-[15.5px] font-bold tracking-[-0.005em] text-fg1 rtl:font-arabic-display rtl:text-[17px] rtl:tracking-normal">
            {t('bookings_heading')}
          </h3>
          <Link
            href="/admin/booking/orders"
            className="text-[12px] text-fg3 transition-colors hover:text-accent"
          >
            {t('see_all_bookings')}
          </Link>
        </header>
        {bookingOrders.length === 0 ? (
          <p className="mt-3 text-[12.5px] text-fg3">{t('empty')}</p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {bookingOrders.map((b, i) => {
              const title = isAr ? b.bookingTitleAr : b.bookingTitleEn
              return (
                <li
                  key={b.id}
                  className={`flex flex-col gap-1 py-3 ${
                    i === 0 ? 'pt-1.5' : 'border-t border-border'
                  }`}
                >
                  <Link
                    href={`/admin/booking/orders/${b.id}`}
                    className="flex flex-col gap-1 transition-colors hover:text-accent"
                  >
                    <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
                      <span className="min-w-0 truncate font-semibold text-fg1">
                        {title || t('untitled_booking')}
                      </span>
                      <span className="flex-none tabular-nums num-latn text-fg2">
                        {currencyFmt.format(b.amountPaid / 100)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[12.5px] text-fg3">
                      <span className="min-w-0 truncate">{b.userEmail}</span>
                      <StatusBadge status={b.status} />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </article>

      {/* Questions */}
      <article className="flex flex-col rounded-md border border-border bg-bg-elevated p-5">
        <header className="mb-1 flex items-baseline justify-between">
          <h3 className="font-display text-[15.5px] font-bold tracking-[-0.005em] text-fg1 rtl:font-arabic-display rtl:text-[17px] rtl:tracking-normal">
            {t('questions_heading')}
          </h3>
          <Link
            href="/admin/questions"
            className="text-[12px] text-fg3 transition-colors hover:text-accent"
          >
            {t('see_all_questions')}
          </Link>
        </header>
        {questions.length === 0 ? (
          <p className="mt-3 text-[12.5px] text-fg3">{t('empty')}</p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {questions.map((q, i) => {
              const asker = q.isAnonymous
                ? t('anonymous')
                : q.user?.name ?? q.user?.email ?? t('anonymous')
              return (
                <li
                  key={q.id}
                  className={`flex flex-col gap-1 py-3 ${
                    i === 0 ? 'pt-1.5' : 'border-t border-border'
                  }`}
                >
                  <Link
                    href={`/admin/questions?status=${q.status}`}
                    className="flex flex-col gap-1 transition-colors hover:text-accent"
                  >
                    <div className="text-[13.5px]">
                      <span className="block truncate font-semibold text-fg1">
                        {q.subject}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[12.5px] text-fg3">
                      <span className="min-w-0 truncate">{asker}</span>
                      <StatusBadge status={q.status} />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </article>
    </div>
  )
}
