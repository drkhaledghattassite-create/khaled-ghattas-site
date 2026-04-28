'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link, useRouter } from '@/lib/i18n/navigation'
import { DataTable, type ColumnDef } from './DataTable'
import { StatusBadge } from './StatusBadge'
import type { Event } from '@/lib/db/queries'

export function EventsTable({ events }: { events: Event[] }) {
  const t = useTranslations('admin.event_form')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm(tActions('confirm_delete'))) return
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_deleted'))
      router.refresh()
    } catch (err) {
      console.error('[EventsTable/delete]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setBusy(null)
    }
  }

  const columns: ColumnDef<Event>[] = [
    {
      accessorKey: 'titleEn',
      header: t('title_en'),
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-fg1">{row.original.titleEn}</span>
          <span dir="rtl" className="text-[11px] text-fg3">{row.original.titleAr}</span>
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
            className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
            aria-label={tForms('edit')}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <button
            type="button"
            disabled={busy === row.original.id}
            onClick={() => handleDelete(row.original.id)}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-accent/80 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
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
