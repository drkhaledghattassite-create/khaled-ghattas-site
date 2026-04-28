'use client'

import { useTranslations } from 'next-intl'
import { Download, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type ColumnDef } from './DataTable'
import { StatusBadge } from './StatusBadge'
import type { Subscriber } from '@/lib/db/queries'

export function SubscribersPanel({ subscribers }: { subscribers: Subscriber[] }) {
  const t = useTranslations('admin.subscribers')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')

  function exportCsv() {
    const header = 'email,name_en,name_ar,status,source,subscribed_at\n'
    const rows = subscribers
      .map((s) =>
        [
          s.email,
          s.nameEn ?? '',
          s.nameAr ?? '',
          s.status,
          s.source ?? '',
          s.createdAt.toISOString(),
        ]
          .map((v) => `"${v.replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(tActions('success_exported'))
  }

  const columns: ColumnDef<Subscriber>[] = [
    { accessorKey: 'email', header: t('email') },
    {
      accessorKey: 'nameEn',
      header: t('name'),
      cell: ({ row }) => row.original.nameEn ?? row.original.nameAr ?? '—',
    },
    { accessorKey: 'source', header: t('source'), cell: ({ row }) => row.original.source ?? '—' },
    {
      accessorKey: 'status',
      header: t('status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: t('subscribed_at'),
      cell: ({ row }) => row.original.createdAt.toISOString().slice(0, 10),
    },
    {
      id: 'actions',
      header: tForms('actions'),
      enableSorting: false,
      cell: () => (
        <button
          type="button"
          onClick={() => toast.success(tActions('success_deleted'))}
          aria-label={tForms('delete')}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-accent/80 hover:bg-accent-soft hover:text-accent"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-fg3">{t('description')}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toast.info(t('newsletter_coming'))}
            className="font-label inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-4 py-2 text-[12px] text-fg1 hover:bg-bg-deep"
          >
            <Send className="h-3.5 w-3.5" aria-hidden />
            {t('send_newsletter')}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="font-label inline-flex items-center gap-1.5 rounded-full border border-dashed border-fg1 bg-fg1 px-4 py-2 text-[12px] text-bg hover:bg-transparent hover:text-fg1"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            {t('export_csv')}
          </button>
        </div>
      </div>
      <DataTable columns={columns} data={subscribers} />
    </div>
  )
}
