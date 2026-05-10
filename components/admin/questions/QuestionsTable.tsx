'use client'

/**
 * Phase B2 — admin queue table for /admin/questions.
 *
 * Columns: Created · Asker · Subject · Category · Status · Actions
 *
 * Action menu is state-aware:
 *   - PENDING:  Mark answered · Archive · Delete
 *   - ANSWERED: Edit answer · Revert to pending · Archive · Delete
 *   - ARCHIVED: Restore to pending · Delete
 *
 * The "Anonymous" column from the original B2 spec was dropped: the user-
 * facing toggle was removed pre-launch, so the badge only ever rendered
 * for legacy data — and we have none of that yet.
 */

import { useTranslations } from 'next-intl'
import { MoreHorizontal } from 'lucide-react'
import { DataTable, type ColumnDef } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AdminQuestionsRow } from './AdminQuestionsPage'

type Props = {
  rows: AdminQuestionsRow[]
  onMarkAnswered: (row: AdminQuestionsRow) => void
  onEditAnswer: (row: AdminQuestionsRow) => void
  onArchive: (row: AdminQuestionsRow) => void
  onRevert: (row: AdminQuestionsRow) => void
  onDelete: (row: AdminQuestionsRow) => void
}

// YYYY-MM-DD HH:MM is the convention used elsewhere in admin tables
// (corporate_requests). Locale-neutral on purpose so the column width is
// predictable across both AR and EN — no `locale` arg needed.
function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

export function QuestionsTable({
  rows,
  onMarkAnswered,
  onEditAnswer,
  onArchive,
  onRevert,
  onDelete,
}: Props) {
  const t = useTranslations('admin.questions')
  const tForms = useTranslations('admin.forms')
  const tCat = useTranslations('dashboard.ask.form')

  const columns: ColumnDef<AdminQuestionsRow>[] = [
    {
      accessorKey: 'createdAt',
      header: t('table.col_created'),
      cell: ({ row }) => (
        <span className="text-[12px] text-fg3 [font-feature-settings:'tnum']">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: 'user',
      header: t('table.col_asker'),
      cell: ({ row }) => {
        const u = row.original.user
        if (!u) {
          // Orphan: asker row missing despite ON DELETE CASCADE. Surface
          // the state explicitly so admin doesn't think the cell is just
          // missing data.
          return (
            <span className="text-[12px] italic text-fg3">
              {t('table.asker_unknown')}
            </span>
          )
        }
        return (
          <div className="flex flex-col leading-tight">
            <span className="font-medium text-fg1">{u.name ?? '—'}</span>
            <span className="text-[11px] text-fg3" dir="ltr">
              {u.email}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'subject',
      header: t('table.col_subject'),
      cell: ({ row }) => (
        <span
          className="block max-w-[36ch] truncate text-fg1"
          title={row.original.subject}
        >
          {row.original.subject}
        </span>
      ),
    },
    {
      accessorKey: 'category',
      header: t('table.col_category'),
      cell: ({ row }) => {
        const cat = row.original.category
        if (!cat) return <span className="text-[12px] text-fg3">—</span>
        // Translation key shape mirrors the user-facing form: `category_<slug>`.
        return (
          <span className="text-[13px] text-fg2">
            {tCat(`category_${cat}` as 'category_general')}
          </span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: t('table.col_status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: tForms('actions'),
      enableSorting: false,
      cell: ({ row }) => (
        <ActionMenu
          row={row.original}
          onMarkAnswered={onMarkAnswered}
          onEditAnswer={onEditAnswer}
          onArchive={onArchive}
          onRevert={onRevert}
          onDelete={onDelete}
        />
      ),
    },
  ]

  return <DataTable columns={columns} data={rows} />
}

function ActionMenu({
  row,
  onMarkAnswered,
  onEditAnswer,
  onArchive,
  onRevert,
  onDelete,
}: {
  row: AdminQuestionsRow
  onMarkAnswered: (row: AdminQuestionsRow) => void
  onEditAnswer: (row: AdminQuestionsRow) => void
  onArchive: (row: AdminQuestionsRow) => void
  onRevert: (row: AdminQuestionsRow) => void
  onDelete: (row: AdminQuestionsRow) => void
}) {
  const t = useTranslations('admin.questions.actions')
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
        {row.status === 'PENDING' && (
          <>
            <DropdownMenuItem onClick={() => onMarkAnswered(row)}>
              {t('mark_answered')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchive(row)}>
              {t('archive')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(row)}
              className="text-danger focus:text-danger"
            >
              {t('delete')}
            </DropdownMenuItem>
          </>
        )}
        {row.status === 'ANSWERED' && (
          <>
            <DropdownMenuItem onClick={() => onEditAnswer(row)}>
              {t('edit_answer')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRevert(row)}>
              {t('revert_to_pending')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchive(row)}>
              {t('archive')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(row)}
              className="text-danger focus:text-danger"
            >
              {t('delete')}
            </DropdownMenuItem>
          </>
        )}
        {row.status === 'ARCHIVED' && (
          <>
            <DropdownMenuItem onClick={() => onRevert(row)}>
              {t('restore')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(row)}
              className="text-danger focus:text-danger"
            >
              {t('delete')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
