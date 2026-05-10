'use client'

/**
 * Phase C2 — admin tests table.
 *
 * Columns: Title · Slug · Category · Status · Questions · Attempts ·
 * Avg score · Created · Actions.
 *
 * Action menu is state-aware:
 *   - Always: View analytics, Edit, Delete.
 *   - Draft → Publish; Published → Unpublish.
 */

import { useTranslations } from 'next-intl'
import { MoreHorizontal } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { DataTable, type ColumnDef } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AdminTestRow } from './AdminTestsListPage'

type Props = {
  rows: AdminTestRow[]
  locale: 'ar' | 'en'
  onPublish: (row: AdminTestRow, next: boolean) => void
  onDelete: (row: AdminTestRow) => void
}

function formatCreated(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toISOString().slice(0, 10)
}

export function TestsTable({ rows, locale, onPublish, onDelete }: Props) {
  const t = useTranslations('admin.tests.list')
  const tForms = useTranslations('admin.forms')
  const tCat = useTranslations('dashboard.ask.form')

  const columns: ColumnDef<AdminTestRow>[] = [
    {
      accessorKey: 'titleEn',
      header: t('table.col_title'),
      cell: ({ row }) => {
        const primary = locale === 'ar' ? row.original.titleAr : row.original.titleEn
        const secondary = locale === 'ar' ? row.original.titleEn : row.original.titleAr
        return (
          <Link
            href={`/admin/tests/${row.original.id}/edit`}
            className="flex flex-col leading-tight transition-colors hover:text-accent"
          >
            <span className="font-medium text-fg1">{primary}</span>
            <span
              dir={locale === 'ar' ? 'ltr' : 'rtl'}
              className="text-[11px] text-fg3"
            >
              {secondary}
            </span>
          </Link>
        )
      },
    },
    {
      accessorKey: 'slug',
      header: t('table.col_slug'),
      cell: ({ row }) => (
        <span
          dir="ltr"
          className="block max-w-[24ch] truncate font-mono text-[11px] text-fg3"
          title={row.original.slug}
        >
          {row.original.slug}
        </span>
      ),
    },
    {
      accessorKey: 'category',
      header: t('table.col_category'),
      cell: ({ row }) => (
        <span className="text-[13px] text-fg2">
          {tCat(
            `category_${row.original.category}` as 'category_general',
          )}
        </span>
      ),
    },
    {
      accessorKey: 'isPublished',
      header: t('table.col_status'),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.isPublished ? 'PUBLISHED' : 'DRAFT'}
        />
      ),
    },
    {
      accessorKey: 'questionCount',
      header: t('table.col_questions'),
      cell: ({ row }) => (
        <span className="[font-feature-settings:'tnum']">
          {row.original.questionCount}
        </span>
      ),
    },
    {
      accessorKey: 'attemptCount',
      header: t('table.col_attempts'),
      cell: ({ row }) => (
        <span className="[font-feature-settings:'tnum']">
          {row.original.attemptCount}
        </span>
      ),
    },
    {
      accessorKey: 'averageScore',
      header: t('table.col_avg_score'),
      cell: ({ row }) =>
        row.original.averageScore == null ? (
          <span className="text-fg3">—</span>
        ) : (
          <span className="[font-feature-settings:'tnum']">
            {row.original.averageScore}%
          </span>
        ),
    },
    {
      accessorKey: 'createdAt',
      header: t('table.col_created'),
      cell: ({ row }) => (
        <span
          className="text-[12px] text-fg3 [font-feature-settings:'tnum']"
          title={row.original.createdAt}
        >
          {formatCreated(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: tForms('actions'),
      enableSorting: false,
      cell: ({ row }) => (
        <ActionMenu row={row.original} onPublish={onPublish} onDelete={onDelete} />
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={rows}
      emptyAction={
        <Link href="/admin/tests/new" className="btn-pill btn-pill-primary">
          {t('empty.cta')}
        </Link>
      }
    />
  )
}

function ActionMenu({
  row,
  onPublish,
  onDelete,
}: {
  row: AdminTestRow
  onPublish: (row: AdminTestRow, next: boolean) => void
  onDelete: (row: AdminTestRow) => void
}) {
  const t = useTranslations('admin.tests.list.actions')
  const tAria = useTranslations('admin.aria')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={tAria('row_actions')}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
      >
        <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuItem
          render={<Link href={`/admin/tests/${row.id}/analytics`} />}
        >
          {t('view_analytics')}
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href={`/admin/tests/${row.id}/edit`} />}
        >
          {t('edit')}
        </DropdownMenuItem>
        {row.isPublished ? (
          <DropdownMenuItem onClick={() => onPublish(row, false)}>
            {t('unpublish')}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onPublish(row, true)}>
            {t('publish')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(row)}
          className="text-danger focus:text-danger"
        >
          {t('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
