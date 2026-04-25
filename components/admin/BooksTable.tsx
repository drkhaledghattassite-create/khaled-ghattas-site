'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from '@/lib/i18n/navigation'
import { DataTable, type ColumnDef } from './DataTable'
import { StatusBadge } from './StatusBadge'
import type { Book } from '@/lib/db/queries'

export function BooksTable({ books }: { books: Book[] }) {
  const tBook = useTranslations('admin.book_form')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')

  const columns: ColumnDef<Book>[] = [
    {
      id: 'cover',
      header: tBook('cover_image'),
      cell: ({ row }) => (
        <span className="relative block h-10 w-8 overflow-hidden rounded border border-dashed border-ink/30 bg-cream-warm">
          <Image src={row.original.coverImage} alt="" fill sizes="32px" className="object-cover" />
        </span>
      ),
    },
    {
      accessorKey: 'titleEn',
      header: tBook('title_en'),
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-ink">{row.original.titleEn}</span>
          <span dir="rtl" className="text-[11px] text-ink-muted">{row.original.titleAr}</span>
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
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/books/${row.original.slug}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-cream-warm/60 hover:text-ink"
            aria-label={tForms('view')}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link
            href={`/admin/books/${row.original.id}/edit`}
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

  return <DataTable columns={columns} data={books} />
}
