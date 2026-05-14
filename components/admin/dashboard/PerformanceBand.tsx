import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { RevenueChart } from './RevenueChart'
import { SubscribersChart } from './SubscribersChart'
import type {
  DailyComparison,
  DailyCountComparison,
} from '@/lib/db/queries'

// Revenue + Subscribers cards side-by-side on desktop, stacked on mobile.
// Each card mirrors the design: heading + period label, legend chips for
// "this period" / "prior period", the chart, a summary line with a big
// number + a delta pill + a context phrase.

type Tone = 'up' | 'down' | 'flat'

function toneFor(deltaPercent: number | null): Tone {
  if (deltaPercent === null) return 'flat'
  if (deltaPercent > 0) return 'up'
  if (deltaPercent < 0) return 'down'
  return 'flat'
}

function DeltaPill({
  deltaPercent,
  locale,
}: {
  deltaPercent: number | null
  locale: string
}) {
  const tone = toneFor(deltaPercent)
  const numberFmt = new Intl.NumberFormat(
    locale === 'ar' ? 'ar-EG' : 'en-US',
    { maximumFractionDigits: 0 },
  )
  if (deltaPercent === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-bg-deep px-2.5 py-0.5 text-[12.5px] font-semibold text-fg2">
        <Minus className="h-3 w-3" aria-hidden />
        <span className="tabular-nums num-latn">—</span>
      </span>
    )
  }
  const Icon = tone === 'down' ? ArrowDown : ArrowUp
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${
        tone === 'up'
          ? 'bg-accent-soft text-accent'
          : 'bg-bg-deep text-fg2'
      }`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.25} aria-hidden />
      <span className="tabular-nums num-latn">
        {deltaPercent > 0 ? '+' : ''}
        {numberFmt.format(deltaPercent)}%
      </span>
    </span>
  )
}

export async function PerformanceBand({
  locale,
  revenue,
  subscribers,
}: {
  locale: string
  revenue: DailyComparison
  subscribers: DailyCountComparison
}) {
  const t = await getTranslations({ locale, namespace: 'admin.dashboard.performance' })
  const isAr = locale === 'ar'

  const currencyFmt = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
  const numberFmt = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 0,
  })

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
      {/* Revenue card */}
      <article className="rounded-md border border-border bg-bg-elevated p-6 pb-5">
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-[18px] font-bold tracking-[-0.005em] text-fg1 rtl:font-arabic-display rtl:text-[20px] rtl:tracking-normal">
            {t('revenue_heading')}
          </h3>
          <span className="text-[12px] tabular-nums num-latn text-fg3">
            {t('period_label')}
          </span>
        </header>
        <div className="mb-2 flex gap-4 text-[11.5px] text-fg3">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="block h-[2px] w-3.5 bg-accent"
              style={{ borderRadius: 1 }}
            />
            <span>{t('legend_current')}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="block h-0 w-3.5"
              style={{
                borderTop: '1px dashed var(--color-accent)',
                opacity: 0.5,
              }}
            />
            <span>{t('legend_prior')}</span>
          </span>
        </div>
        <RevenueChart current={revenue.current} prior={revenue.prior} />
        <footer className="mt-4 flex flex-wrap items-baseline gap-2.5 border-t border-border pt-4 text-[13.5px] text-fg2">
          <span className="font-display text-[22px] font-bold tracking-[-0.01em] tabular-nums num-latn text-fg1 rtl:font-arabic-display rtl:tracking-normal">
            {currencyFmt.format(revenue.currentTotal)}
          </span>
          <DeltaPill deltaPercent={revenue.deltaPercent} locale={locale} />
          <span>{t('this_period')}</span>
          <span className="basis-full text-[12.5px] text-fg3">
            {t('compared_with_revenue', {
              prior: currencyFmt.format(revenue.priorTotal),
            })}
          </span>
        </footer>
      </article>

      {/* Subscribers card */}
      <article className="rounded-md border border-border bg-bg-elevated p-6 pb-5">
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-[18px] font-bold tracking-[-0.005em] text-fg1 rtl:font-arabic-display rtl:text-[20px] rtl:tracking-normal">
            {t('subscribers_heading')}
          </h3>
          <span className="text-[12px] tabular-nums num-latn text-fg3">
            {t('period_label')}
          </span>
        </header>
        <div className="mb-2 flex gap-4 text-[11.5px] text-fg3">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="block h-[2px] w-3.5 bg-accent"
              style={{ borderRadius: 1 }}
            />
            <span>{t('legend_current')}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="block h-0 w-3.5"
              style={{
                borderTop: '1px dashed var(--color-accent)',
                opacity: 0.5,
              }}
            />
            <span>{t('legend_prior')}</span>
          </span>
        </div>
        <SubscribersChart
          current={subscribers.current}
          prior={subscribers.prior}
        />
        <footer className="mt-4 flex flex-wrap items-baseline gap-2.5 border-t border-border pt-4 text-[13.5px] text-fg2">
          <span className="font-display text-[22px] font-bold tracking-[-0.01em] tabular-nums num-latn text-fg1 rtl:font-arabic-display rtl:tracking-normal">
            {numberFmt.format(subscribers.currentTotal)}
          </span>
          <DeltaPill deltaPercent={subscribers.deltaPercent} locale={locale} />
          <span>{t('this_period')}</span>
          <span className="basis-full text-[12.5px] text-fg3">
            {t('compared_with_subscribers', {
              prior: numberFmt.format(subscribers.priorTotal),
            })}
          </span>
        </footer>
      </article>
    </div>
  )
}
