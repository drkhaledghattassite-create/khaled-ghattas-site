import { getTranslations } from 'next-intl/server'
import type { AudienceSnapshotCounts } from '@/lib/db/queries'

// Four calm stat tiles in a single bordered container, divided by
// hairlines. "Where we are" feel — less prominent than the attention
// cards, no accent backgrounds.

export async function AudienceSnapshot({
  locale,
  counts,
}: {
  locale: string
  counts: AudienceSnapshotCounts
}) {
  const t = await getTranslations({
    locale,
    namespace: 'admin.dashboard.audience',
  })
  const numberFmt = new Intl.NumberFormat(
    locale === 'ar' ? 'ar-EG' : 'en-US',
    { maximumFractionDigits: 0 },
  )

  const tiles: Array<{ label: string; value: string; delta: string | null }> = [
    {
      label: t('subscribers_label'),
      value: numberFmt.format(counts.activeSubscribers),
      delta:
        counts.subscribersThisWeek > 0
          ? t('this_week_delta', {
              count: numberFmt.format(counts.subscribersThisWeek),
            })
          : null,
    },
    {
      label: t('users_label'),
      value: numberFmt.format(counts.registeredUsers),
      delta:
        counts.usersThisWeek > 0
          ? t('this_week_delta', {
              count: numberFmt.format(counts.usersThisWeek),
            })
          : null,
    },
    {
      label: t('books_label'),
      value: numberFmt.format(counts.booksPublished),
      delta: null,
    },
    {
      label: t('tests_label'),
      value: numberFmt.format(counts.testsPublished),
      delta: null,
    },
  ]

  return (
    <div className="grid overflow-hidden rounded-md border border-border bg-bg-elevated grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile, i) => {
        const isLastCol =
          (i + 1) % 2 === 0 // mobile last col
        const isLastDesktopCol = (i + 1) % 4 === 0
        return (
          <div
            key={tile.label}
            className={`flex flex-col gap-1 p-6 ${
              !isLastCol
                ? 'border-e border-border'
                : 'lg:border-e lg:border-border'
            } ${isLastDesktopCol ? 'lg:border-e-0' : ''} ${
              i < 2 ? 'border-b border-border lg:border-b-0' : ''
            }`}
          >
            <div className="mb-1.5 text-[11.5px] font-medium uppercase tracking-[0.06em] text-fg3 rtl:text-[13px] rtl:font-semibold rtl:tracking-normal rtl:normal-case">
              {tile.label}
            </div>
            <div className="font-display text-[32px] font-bold leading-none tracking-[-0.02em] tabular-nums num-latn text-fg1">
              {tile.value}
            </div>
            {tile.delta ? (
              <div className="mt-2 text-[12px] tabular-nums num-latn text-fg3">
                <span className="font-semibold text-fg2">{tile.delta}</span>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
