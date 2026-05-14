import { ChevronRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import type { TestResearchHighlight } from '@/lib/db/queries'

// The editorial centerpiece. For each of the top tests by 30d attempts:
// title, attempts meta, the editorial "X% selected: Y" pull-quote line,
// the question prompt, and the option distribution as one mini-bar per
// option. View-full-analytics link sends to /admin/tests/[slug]/analytics.
//
// Per-option bars (not a single segmented bar) — the design's CSS reads
// one `.dist .bar` per option, each width = that option's percentage.

const INDEX_LABELS_EN = ['01', '02', '03', '04', '05', '06']
const INDEX_LABELS_AR = ['٠١', '٠٢', '٠٣', '٠٤', '٠٥', '٠٦']

export async function ResearchHighlights({
  locale,
  highlights,
}: {
  locale: string
  highlights: TestResearchHighlight[]
}) {
  const t = await getTranslations({
    locale,
    namespace: 'admin.dashboard.research',
  })
  const isAr = locale === 'ar'
  const numberFmt = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 0,
  })

  return (
    <div className="rounded-md border border-border bg-bg-elevated p-7 lg:p-10">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-accent rtl:text-[13px] rtl:font-bold rtl:tracking-normal rtl:normal-case rtl:font-arabic">
            {t('eyebrow')}
          </span>
          <h2 className="font-display text-[28px] font-bold leading-[1.15] tracking-[-0.015em] text-fg1 rtl:font-arabic-display rtl:text-[32px] rtl:tracking-normal">
            {t('heading')}
          </h2>
        </div>
        <Link
          href="/admin/tests"
          className="inline-flex flex-none items-center gap-1 whitespace-nowrap text-[13px] text-fg2 transition-colors hover:text-accent"
        >
          <span>{t('see_all')}</span>
          <ChevronRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
        </Link>
      </div>
      <p className="mb-6 max-w-[56ch] text-[14.5px] leading-[1.55] text-fg2 rtl:text-[16px] rtl:leading-[1.8]">
        {t('intro')}
      </p>

      {highlights.length === 0 ? (
        <p className="border-t border-border pt-6 text-[14px] leading-[1.6] text-fg3 rtl:text-[15.5px] rtl:leading-[1.8]">
          {t('empty')}
        </p>
      ) : (
        <ol className="list-none p-0">
          {highlights.map((h, i) => {
            const title = isAr ? h.testTitleAr : h.testTitleEn
            const prompt = isAr ? h.questionPromptAr : h.questionPromptEn
            const topLabel = isAr ? h.topOptionLabelAr : h.topOptionLabelEn
            const idx =
              (isAr ? INDEX_LABELS_AR[i] : INDEX_LABELS_EN[i]) ??
              numberFmt.format(i + 1)
            return (
              <li
                key={h.testId}
                className="grid items-start gap-7 border-t border-border py-6 lg:grid-cols-[28px_1fr_360px_auto]"
              >
                <div className="font-display text-[16px] font-medium tabular-nums num-latn text-fg3 lg:pt-1">
                  {idx}
                </div>
                <div className="min-w-0">
                  <h3 className="mb-1.5 font-display text-[18px] font-bold tracking-[-0.005em] text-fg1 [text-wrap:pretty] rtl:font-arabic-display rtl:text-[21px] rtl:leading-[1.4] rtl:tracking-normal">
                    {title}
                  </h3>
                  <div className="mb-2.5 flex flex-wrap items-center gap-2.5 text-[12.5px] tabular-nums num-latn text-fg3 rtl:text-[13px]">
                    <span>
                      {t('attempts_in_30d', {
                        count: numberFmt.format(h.totalAttempts),
                      })}
                    </span>
                    <span
                      aria-hidden
                      className="inline-block h-[3px] w-[3px] rounded-full bg-fg3/60"
                    />
                    <span>{t('window_30d')}</span>
                  </div>
                  <p className="mt-1.5 max-w-[52ch] text-[14.5px] leading-[1.55] text-fg2 rtl:text-[16px] rtl:leading-[1.8]">
                    <strong className="font-bold text-fg1">
                      {t('selected_summary', {
                        percent: numberFmt.format(h.topOptionPercentage),
                        label: topLabel,
                      })}
                    </strong>
                  </p>
                </div>
                <div className="min-w-0 lg:pt-1">
                  <p className="mb-2.5 text-[11.5px] font-medium uppercase tracking-[0.06em] text-fg3 rtl:text-[13px] rtl:font-semibold rtl:tracking-normal rtl:normal-case">
                    {prompt}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {h.options.map((o, j) => {
                      const optLabel = isAr ? o.labelAr : o.labelEn
                      return (
                        <div key={j} className="grid grid-cols-[1fr_42px] items-center gap-2.5 text-[12.5px] rtl:text-[13.5px]">
                          <span
                            className={`truncate ${
                              o.isTop ? 'font-semibold text-fg1' : 'text-fg2'
                            }`}
                          >
                            {optLabel}
                          </span>
                          <span
                            className={`text-end text-[12px] tabular-nums num-latn ${
                              o.isTop
                                ? 'font-semibold text-accent'
                                : 'text-fg2'
                            }`}
                          >
                            {isAr ? `٪${o.selectionPercentage}` : `${o.selectionPercentage}%`}
                          </span>
                          <div
                            className="relative col-span-full h-1 overflow-hidden rounded-[2px] bg-bg-deep"
                            aria-hidden
                          >
                            <span
                              className={`block h-full rounded-[2px] ${
                                o.isTop
                                  ? 'bg-accent'
                                  : 'bg-accent/[0.35]'
                              }`}
                              style={{ width: `${o.selectionPercentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <Link
                  href={`/admin/tests/${h.testId}/analytics`}
                  className="inline-flex flex-none items-center gap-1.5 self-start text-[13px] text-fg2 transition-colors hover:text-accent lg:self-center"
                >
                  <span>{t('view_analytics')}</span>
                  <ChevronRight
                    className="h-3.5 w-3.5 rtl:-scale-x-100"
                    aria-hidden
                  />
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
