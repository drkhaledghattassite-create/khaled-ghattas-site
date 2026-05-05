'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, Layers, Pencil, Trash2 } from 'lucide-react'
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
import type { Book } from '@/lib/db/queries'

export function BooksTable({ books }: { books: Book[] }) {
  const tBook = useTranslations('admin.book_form')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const tConfirm = useTranslations('admin.confirm')
  const tAria = useTranslations('admin.aria')
  const tContent = useTranslations('admin.session_content')
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  // See ArticlesTable for the rationale on the `pending` shape.
  const [pending, setPending] = useState<{ id: string; name: string } | null>(null)

  async function handleDelete(id: string) {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/books/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_deleted'))
      router.refresh()
    } catch (err) {
      console.error('[BooksTable/delete]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setBusy(null)
      setPending(null)
    }
  }

  const columns: ColumnDef<Book>[] = [
    {
      id: 'cover',
      header: tBook('cover_image'),
      cell: ({ row }) => (
        <span className="relative block h-10 w-8 overflow-hidden rounded border border-border bg-bg-deep">
          <Image src={row.original.coverImage} alt="" fill sizes="32px" className="object-cover" />
        </span>
      ),
    },
    {
      accessorKey: 'titleEn',
      header: tBook('title_en'),
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-fg1">{row.original.titleEn}</span>
          <span dir="rtl" className="text-[11px] text-fg3">{row.original.titleAr}</span>
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: tBook('price'),
      cell: ({ row }) => (row.original.price ? `$${row.original.price}` : '—'),
    },
    {
      accessorKey: 'publicationYear',
      header: tBook('publication_year'),
      cell: ({ row }) => row.original.publicationYear ?? '—',
    },
    {
      accessorKey: 'status',
      header: tBook('status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'featured',
      header: tBook('featured'),
      cell: ({ row }) => (row.original.featured ? '★' : '—'),
    },
    {
      id: 'actions',
      header: tForms('actions'),
      enableSorting: false,
      cell: ({ row }) => {
        const displayName = row.original.titleEn || row.original.titleAr || row.original.slug
        return (
          <div className="flex items-center gap-1">
            <Link
              href={`/books/${row.original.slug}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
              aria-label={tAria('view_item', { name: displayName })}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <Link
              href={`/admin/books/${row.original.id}/edit`}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
              aria-label={tAria('edit_item', { name: displayName })}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </Link>
            {row.original.productType === 'SESSION' && (
              <Link
                href={`/admin/books/${row.original.id}/content`}
                className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
                aria-label={tContent('manage_aria', { name: displayName })}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}
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
      <DataTable columns={columns} data={books} />
      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm('delete_book_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && tConfirm('delete_book_body', { name: pending.name })}
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
