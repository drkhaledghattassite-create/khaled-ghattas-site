'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link, useRouter } from '@/lib/i18n/navigation'
import { DataTable, type ColumnDef } from './DataTable'
import { StatusBadge } from './StatusBadge'
import type { Article } from '@/lib/db/queries'

export function ArticlesTable({ articles }: { articles: Article[] }) {
  const t = useTranslations('admin.article_form')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm(tActions('confirm_delete'))) return
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_deleted'))
      router.refresh()
    } catch (err) {
      console.error('[ArticlesTable/delete]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setBusy(null)
    }
  }

  const columns: ColumnDef<Article>[] = [
    {
      id: 'cover',
      header: t('cover_image'),
      cell: ({ row }) =>
        row.original.coverImage ? (
          <span className="relative block h-10 w-14 overflow-hidden rounded border border-border bg-bg-deep">
            <Image
              src={row.original.coverImage}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
          </span>
        ) : (
          <span className="block h-10 w-14 rounded border border-border bg-bg-deep" />
        ),
    },
    {
      accessorKey: 'titleEn',
      header: t('title_en'),
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-fg1">{row.original.titleEn}</span>
          <span dir="rtl" className="text-[11px] text-fg3">
            {row.original.titleAr}
          </span>
        </div>
      ),
    },
    { accessorKey: 'category', header: t('category') },
    {
      accessorKey: 'status',
      header: t('status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'featured',
      header: t('featured'),
      cell: ({ row }) => (row.original.featured ? '★' : '—'),
    },
    {
      accessorKey: 'viewCount',
      header: 'Views',
      cell: ({ row }) => row.original.viewCount.toLocaleString(),
    },
    {
      accessorKey: 'publishedAt',
      header: t('published_at'),
      cell: ({ row }) =>
        (row.original.publishedAt ?? row.original.createdAt).toISOString().slice(0, 10),
    },
    {
      id: 'actions',
      header: tForms('actions'),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/articles/${row.original.slug}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
            aria-label={tForms('view')}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link
            href={`/admin/articles/${row.original.id}/edit`}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
            aria-label={tForms('edit')}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <button
            type="button"
            aria-label={tForms('delete')}
            disabled={busy === row.original.id}
            onClick={() => handleDelete(row.original.id)}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-accent/80 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ),
    },
  ]

  return <DataTable columns={columns} data={articles} />
}
