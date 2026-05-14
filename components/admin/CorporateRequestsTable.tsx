'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Eye, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link, useRouter as useI18nRouter } from '@/lib/i18n/navigation'
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
import type {
  CorporateRequest,
  CorporateRequestStatus,
  CorporateProgram,
} from '@/lib/db/queries'
import { CORPORATE_REQUEST_STATUSES } from '@/lib/validators/corporate'

type Filter = {
  status: CorporateRequestStatus | 'all'
  search: string
}

type Props = {
  requests: CorporateRequest[]
  programs: CorporateProgram[]
  locale: string
  total: number
  page: number
  pageSize: number
  initialFilter: Filter
}

export function CorporateRequestsTable({
  requests,
  programs,
  locale,
  total,
  page,
  pageSize,
  initialFilter,
}: Props) {
  const t = useTranslations('admin.corporate_requests')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const tConfirm = useTranslations('admin.confirm')
  const tAria = useTranslations('admin.aria')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const i18nRouter = useI18nRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; name: string } | null>(null)
  const isAr = locale === 'ar'

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const programLookup = useMemo(() => {
    const map = new Map<string, CorporateProgram>()
    for (const p of programs) map.set(p.id, p)
    return map
  }, [programs])

  const setQuery = useCallback(
    (next: { status?: Filter['status']; search?: string; page?: number }) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next.status !== undefined) {
        if (next.status === 'all') params.delete('status')
        else params.set('status', next.status)
        params.delete('page')
      }
      if (next.search !== undefined) {
        const trimmed = next.search.trim()
        if (trimmed) params.set('search', trimmed)
        else params.delete('search')
        params.delete('page')
      }
      if (next.page !== undefined) {
        if (next.page === 1) params.delete('page')
        else params.set('page', String(next.page))
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  async function handleDelete(id: string) {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/corporate/requests/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_deleted'))
      i18nRouter.refresh()
    } catch (err) {
      console.error('[CorporateRequestsTable/delete]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setBusy(null)
      setPending(null)
    }
  }

  const columns: ColumnDef<CorporateRequest>[] = [
    {
      accessorKey: 'name',
      header: t('name'),
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-fg1">{row.original.name}</span>
          <span className="text-[11px] text-fg3">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'organization',
      header: t('organization'),
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-fg1">{row.original.organization}</span>
          {row.original.position && (
            <span className="text-[11px] text-fg3">{row.original.position}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'programId',
      header: t('program'),
      cell: ({ row }) => {
        const program = row.original.programId
          ? programLookup.get(row.original.programId)
          : null
        if (!program) {
          return <span className="text-[12px] text-fg3">{t('no_program')}</span>
        }
        return (
          <span className="text-[13px] text-fg1">
            {isAr ? program.titleAr : program.titleEn}
          </span>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: t('received_at'),
      cell: ({ row }) =>
        row.original.createdAt.toISOString().slice(0, 16).replace('T', ' '),
    },
    {
      accessorKey: 'status',
      header: t('status_label'),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: tForms('actions'),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/corporate/requests/${row.original.id}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
            aria-label={tAria('view_item', { name: row.original.name })}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <button
            type="button"
            disabled={busy === row.original.id}
            onClick={() => setPending({ id: row.original.id, name: row.original.name })}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-accent/80 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
            aria-label={tAria('delete_item', { name: row.original.name })}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={initialFilter.status === 'all'}
          onClick={() => setQuery({ status: 'all' })}
          className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-display font-semibold uppercase tracking-[0.06em] transition-colors ${
            initialFilter.status === 'all'
              ? 'border-fg1 bg-fg1 text-bg'
              : 'border-border text-fg3 hover:bg-bg-deep'
          }`}
        >
          {t('filter.all')}
        </button>
        {CORPORATE_REQUEST_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={initialFilter.status === s}
            onClick={() => setQuery({ status: s })}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-display font-semibold uppercase tracking-[0.06em] transition-colors ${
              initialFilter.status === s
                ? 'border-fg1 bg-fg1 text-bg'
                : 'border-border text-fg3 hover:bg-bg-deep'
            }`}
          >
            {t(`filter.${s}`)}
          </button>
        ))}
        <input
          type="search"
          defaultValue={initialFilter.search}
          placeholder={t('search_placeholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setQuery({ search: (e.target as HTMLInputElement).value })
            }
          }}
          className="ms-2 h-9 min-w-[220px] rounded-full border border-border bg-bg-elevated px-4 text-[13px] text-fg1 placeholder:text-fg3 focus:border-accent focus:outline-none"
        />
      </div>

      <DataTable
        columns={columns}
        data={requests}
        searchable={false}
        pagination={false}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-[12px] text-fg3 font-display">
            {t('pagination_page_of', { current: page, total: totalPages })}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuery({ page: Math.max(1, page - 1) })}
              disabled={page <= 1}
              className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-[12px] font-display font-semibold uppercase tracking-[0.06em] text-fg2 transition-colors hover:bg-bg-deep hover:text-fg1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('pagination_previous')}
            </button>
            <button
              type="button"
              onClick={() => setQuery({ page: Math.min(totalPages, page + 1) })}
              disabled={page >= totalPages}
              className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-[12px] font-display font-semibold uppercase tracking-[0.06em] text-fg2 transition-colors hover:bg-bg-deep hover:text-fg1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('pagination_next')}
            </button>
          </div>
        </div>
      )}

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tConfirm('delete_corporate_request_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending &&
                tConfirm('delete_corporate_request_body', { name: pending.name })}
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
    </div>
  )
}
