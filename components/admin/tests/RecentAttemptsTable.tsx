'use client'

/**
 * Recent attempts panel for the analytics page.
 *
 * Compact (id-less) table showing the last 20 attempts joined with the
 * user identity. PII concern: this is only rendered to admins, who already
 * have access to the users tab — there's nothing here a /admin/users
 * lookup wouldn't already surface.
 */

import { useTranslations } from 'next-intl'
import { DataTable, type ColumnDef } from '@/components/admin/DataTable'
import type { AnalyticsRecentAttempt } from './TestAnalyticsPage'

type Props = {
  rows: AnalyticsRecentAttempt[]
  locale: 'ar' | 'en'
}

export function RecentAttemptsTable({ rows }: Props) {
  const t = useTranslations('admin.tests.analytics.recent')

  const columns: ColumnDef<AnalyticsRecentAttempt>[] = [
    {
      accessorKey: 'user',
      header: t('col_user'),
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-fg1">
            {row.original.user.name ?? '—'}
          </span>
          <span className="text-[11px] text-fg3" dir="ltr">
            {row.original.user.email}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'scorePercentage',
      header: t('col_score'),
      cell: ({ row }) => (
        <span className="[font-feature-settings:'tnum']">
          {row.original.scorePercentage}%
        </span>
      ),
    },
    {
      accessorKey: 'completedAt',
      header: t('col_date'),
      cell: ({ row }) => {
        const d = new Date(row.original.completedAt)
        return (
          <span className="text-[12px] text-fg3 [font-feature-settings:'tnum']">
            {Number.isNaN(d.getTime())
              ? row.original.completedAt
              : d.toISOString().slice(0, 16).replace('T', ' ')}
          </span>
        )
      },
    },
  ]

  return <DataTable columns={columns} data={rows} searchable={false} pagination={false} />
}
