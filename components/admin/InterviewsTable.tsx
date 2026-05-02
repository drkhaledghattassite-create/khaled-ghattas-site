'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link, useRouter } from '@/lib/i18n/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DataTable, type ColumnDef } from './DataTable'
import { StatusBadge } from './StatusBadge'
import type { Interview } from '@/lib/db/queries'

export function InterviewsTable({ interviews }: { interviews: Interview[] }) {
  const t = useTranslations('admin.interview_form')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const tConfirm = useTranslations('admin.confirm')
  const tAria = useTranslations('admin.aria')
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; name: string } | null>(null)

  async function handleDelete(id: string) {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/interviews/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_deleted'))
      router.refresh()
    } catch (err) {
      console.error('[InterviewsTable/delete]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setBusy(null)
      setPending(null)
    }
  }

  const columns: ColumnDef<Interview>[] = [
    {
      id: 'thumb',
      header: t('thumbnail_image'),
      cell: ({ row }) => (
        <span className="relative block h-9 w-12 overflow-hidden rounded border border-border bg-bg-deep">
          <Image src={row.original.thumbnailImage} alt="" fill sizes="48px" className="object-cover" />
        </span>
      ),
    },
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
    { accessorKey: 'source', header: t('source'), cell: ({ row }) => row.original.source ?? '—' },
    { accessorKey: 'year', header: t('year'), cell: ({ row }) => row.original.year ?? '—' },
    { accessorKey: 'status', header: t('status'), cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: 'featured', header: t('featured'), cell: ({ row }) => (row.original.featured ? '★' : '—') },
    {
      id: 'actions',
      header: tForms('actions'),
      enableSorting: false,
      cell: ({ row }) => {
        const displayName = row.original.titleEn || row.original.titleAr || row.original.slug
        return (
          <div className="flex items-center gap-1">
            {row.original.videoUrl ? (
              <a
                href={row.original.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
                aria-label={tAria('view_item', { name: displayName })}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : (
              <span className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3/50">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </span>
            )}
            <Link
              href={`/admin/interviews/${row.original.id}/edit`}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
              aria-label={tAria('edit_item', { name: displayName })}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <button
              type="button"
              aria-label={tAria('delete_item', { name: displayName })}
              disabled={busy === row.original.id}
              onClick={() => setPending({ id: row.original.id, name: displayName })}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-accent/80 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <DataTable columns={columns} data={interviews} />
      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm('delete_interview_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && tConfirm('delete_interview_body', { name: pending.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>
              {tConfirm('delete_cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pending && handleDelete(pending.id)}
              disabled={busy !== null}
              variant="destructive"
            >
              {tConfirm('delete_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
