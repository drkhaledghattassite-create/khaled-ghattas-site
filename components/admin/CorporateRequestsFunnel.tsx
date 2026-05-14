'use client'

import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { CorporateRequestFunnel as FunnelData } from '@/lib/db/queries'

// Step-to-step funnel for inbound corporate requests. Five canonical states
// from the corporate_request_status enum; CANCELLED sits outside the linear
// flow so it renders separately as a small loss-rate annotation.
//
// Conversion math: step-to-step (not cumulative). The "CONTACTED rate" cell
// shows CONTACTED / NEW; the "SCHEDULED rate" shows SCHEDULED / CONTACTED.
// Cumulative percentages would mask poor follow-up at one stage by hiding
// it inside the overall NEW → COMPLETED ratio.

function pct(num: number, denom: number): string {
  if (denom <= 0) return '0%'
  return `${Math.round((num / denom) * 100)}%`
}

export function CorporateRequestsFunnel({ funnel }: { funnel: FunnelData }) {
  const t = useTranslations('admin.corporate_requests.funnel')

  const steps: Array<{
    key: 'NEW' | 'CONTACTED' | 'SCHEDULED' | 'COMPLETED'
    value: number
    rateFrom?: 'NEW' | 'CONTACTED' | 'SCHEDULED'
  }> = [
    { key: 'NEW', value: funnel.NEW },
    { key: 'CONTACTED', value: funnel.CONTACTED, rateFrom: 'NEW' },
    { key: 'SCHEDULED', value: funnel.SCHEDULED, rateFrom: 'CONTACTED' },
    { key: 'COMPLETED', value: funnel.COMPLETED, rateFrom: 'SCHEDULED' },
  ]

  return (
    <section
      aria-label={t('aria_label')}
      className="rounded-md border border-dashed border-border bg-bg-elevated p-5"
    >
      <h2 className="m-0 text-[12px] font-display font-semibold uppercase tracking-[0.1em] text-fg3">
        {t('heading')}
      </h2>
      <ol className="m-0 mt-4 flex flex-wrap items-stretch gap-2 p-0">
        {steps.map((step, idx) => {
          const rate =
            step.rateFrom !== undefined
              ? pct(step.value, funnel[step.rateFrom])
              : null
          return (
            <li
              key={step.key}
              className="flex items-center gap-2 m-0 list-none"
            >
              <div className="flex min-w-[140px] flex-col rounded-md border border-border bg-bg-deep px-4 py-3">
                <span className="text-[10px] font-display font-semibold uppercase tracking-[0.08em] text-fg3">
                  {t(`step_${step.key.toLowerCase()}` as never)}
                </span>
                <span className="font-display text-[28px] font-semibold leading-tight text-fg1 tabular-nums num-latn">
                  {step.value}
                </span>
                {rate !== null && (
                  <span className="text-[11px] text-fg3 font-display">
                    {t('rate_from', { from: t(`step_${step.rateFrom!.toLowerCase()}` as never), rate })}
                  </span>
                )}
              </div>
              {idx < steps.length - 1 && (
                <ArrowRight
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-fg3 rtl:rotate-180"
                />
              )}
            </li>
          )
        })}
      </ol>
      {funnel.CANCELLED > 0 && (
        <p className="mt-3 text-[12px] text-fg3 font-display">
          {t('cancelled_note', { count: funnel.CANCELLED })}
        </p>
      )}
    </section>
  )
}
