'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, Trash2 } from 'lucide-react'
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
import type {
  CorporateRequest,
  CorporateRequestStatus,
  CorporateProgram,
} from '@/lib/db/queries'
import { CORPORATE_REQUEST_STATUSES } from '@/lib/validators/corporate'

type Props = {
  requests: CorporateRequest[]
  programs: CorporateProgram[]
  locale: string
}

export function CorporateRequestsTable({ requests, programs, locale }: Props) {
  const t = useTranslations('admin.corporate_requests')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const tConfirm = useTranslations('admin.confirm')
  const tAria = useTranslations('admin.aria')
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; name: string } | null>(null)
  const [filter, setFilter] = useState<CorporateRequestStatus | 'all'>('all')
  const isAr = locale === 'ar'

  const programLookup = useMemo(() => {
    const map = new Map<string, CorporateProgram>()
    for (const p of programs) map.set(p.id, p)
    return map
  }, [programs])

  const filtered = useMemo(
    () => (filter === 'all' ? requests : requests.filter((r) => r.status === filter)),
    [filter, requests],
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
      router.refresh()
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
          onClick={() => setFilter('all')}
          className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-display font-semibold uppercase tracking-[0.06em] transition-colors ${
            filter === 'all'
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
            onClick={() => setFilter(s)}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-display font-semibold uppercase tracking-[0.06em] transition-colors ${
              filter === s
                ? 'border-fg1 bg-fg1 text-bg'
                : 'border-border text-fg3 hover:bg-bg-deep'
            }`}
          >
            {t(`filter.${s}`)}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} />

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
