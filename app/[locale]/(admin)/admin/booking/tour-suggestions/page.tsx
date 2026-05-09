import { getTranslations, setRequestLocale } from 'next-intl/server'
import { TourSuggestionsTable } from '@/components/admin/TourSuggestionsTable'
import {
  getAllTourSuggestions,
  getTourSuggestionAggregates,
} from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

const AGGREGATE_LIMIT = 10

type Props = { params: Promise<{ locale: string }> }

export default async function AdminTourSuggestionsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.booking_tour_suggestions')

  const [suggestions, aggregates] = await Promise.all([
    getAllTourSuggestions(),
    getTourSuggestionAggregates(),
  ])

  // Already sorted desc by COUNT(*) at the query layer; just slice.
  const topAggregates = aggregates.slice(0, AGGREGATE_LIMIT)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="m-0 text-[clamp(20px,2.4vw,26px)] font-bold tracking-[-0.005em] text-fg1 font-display">
          {t('page_title')}
        </h1>
        <p className="m-0 max-w-[60ch] text-[13px] text-fg3 font-display rtl:font-arabic-body">
          {t('page_description')}
        </p>
      </header>

      <section className="space-y-4 rounded-md border border-dashed border-border bg-bg-elevated p-5">
        <div className="space-y-1">
          <h2 className="m-0 text-[14px] font-display font-semibold uppercase tracking-[0.04em] text-fg1">
            {t('aggregate_panel_title')}
          </h2>
          <p className="m-0 text-[12px] text-fg3 font-display rtl:font-arabic-body">
            {t('aggregate_panel_description')}
          </p>
        </div>

        {topAggregates.length === 0 ? (
          <p className="m-0 text-[13px] text-fg3">{t('aggregate_empty')}</p>
        ) : (
          <ol className="m-0 grid gap-2 ps-0 sm:grid-cols-2">
            {topAggregates.map((agg, idx) => (
              <li
                key={`${agg.country}|${agg.city}`}
                className="flex items-center gap-3 rounded-md border border-border bg-bg-deep px-3 py-2 text-[13px]"
              >
                <span className="font-display font-semibold tabular-nums text-fg3 num-latn w-5 text-end">
                  {idx + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate font-medium text-fg1">
                    {agg.city}
                  </span>
                  <span className="truncate text-[11px] text-fg3">
                    {agg.country}
                  </span>
                </div>
                <span className="font-display font-semibold tabular-nums text-fg1 num-latn">
                  {agg.count}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {suggestions.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-bg-elevated p-10 text-center">
          <p className="m-0 text-[14px] text-fg3 font-display">
            {t('empty_title')}
          </p>
        </div>
      ) : (
        <TourSuggestionsTable suggestions={suggestions} />
      )}
    </div>
  )
}
