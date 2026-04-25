'use client'

import { useTranslations } from 'next-intl'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from '@/lib/i18n/navigation'
import { DataTable, type ColumnDef } from './DataTable'
import { StatusBadge } from './StatusBadge'
import type { Event } from '@/lib/db/queries'

export function EventsTable({ events }: { events: Event[] }) {
  const t = useTranslations('admin.event_form')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')

  const columns: ColumnDef<Event>[] = [
    {
      accessorKey: 'titleEn',
      header: t('title_en'),
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-ink">{row.original.titleEn}</span>
          <span dir="rtl" className="text-[11px] text-ink-muted">{row.original.titleAr}</span>
        </div>
      ),
    },
    {
      accessorKey: 'locationEn',
      header: t('location_en'),
      cell: ({ row }) => row.original.locationEn ?? '—',
    },
    {
      accessorKey: 'startDate',
      header: t('start_date'),
      cell: ({ row }) => row.original.startDate.toISOString().slice(0, 16).replace('T', ' '),
    },
    {
      accessorKey: 'endDate',
      header: t('end_date'),
      cell: ({ row }) => row.original.endDate ? row.original.endDate.toISOString().slice(0, 16).replace('T', ' ') : '—',
    },
    {
      accessorKey: 'status',
      header: t('status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: tForms('actions'),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/events/${row.original.id}/edit`}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-cream-warm/60 hover:text-ink"
            aria-label={tForms('edit')}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => toast.success(tActions('success_deleted'))}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-amber/80 hover:bg-amber/15 hover:text-amber"
            aria-label={tForms('delete')}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ),
    },
  ]

  return <DataTable columns={columns} data={events} />
}
