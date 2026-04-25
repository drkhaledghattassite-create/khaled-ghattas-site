'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from '@/lib/i18n/navigation'
import { DataTable, type ColumnDef } from './DataTable'
import { StatusBadge } from './StatusBadge'
import type { Interview } from '@/lib/db/queries'

export function InterviewsTable({ interviews }: { interviews: Interview[] }) {
  const t = useTranslations('admin.interview_form')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')

  const columns: ColumnDef<Interview>[] = [
    {
      id: 'thumb',
      header: t('thumbnail_image'),
      cell: ({ row }) => (
        <span className="relative block h-9 w-12 overflow-hidden rounded border border-dashed border-ink/30 bg-cream-warm">
          <Image src={row.original.thumbnailImage} alt="" fill sizes="48px" className="object-cover" />
        </span>
      ),
    },
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
    { accessorKey: 'source', header: t('source'), cell: ({ row }) => row.original.source ?? '—' },
    { accessorKey: 'year', header: t('year'), cell: ({ row }) => row.original.year ?? '—' },
    { accessorKey: 'status', header: t('status'), cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: 'featured', header: t('featured'), cell: ({ row }) => (row.original.featured ? '★' : '—') },
    {
      id: 'actions',
      header: tForms('actions'),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <a
            href={row.original.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-cream-warm/60 hover:text-ink"
            aria-label={tForms('view')}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
          <Link
            href={`/admin/interviews/${row.original.id}/edit`}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-cream-warm/60 hover:text-ink"
            aria-label={tForms('edit')}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <button
            type="button"
            aria-label={tForms('delete')}
            onClick={() => toast.success(tActions('success_deleted'))}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-amber/80 hover:bg-amber/15 hover:text-amber"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ),
    },
  ]

  return <DataTable columns={columns} data={interviews} />
}
