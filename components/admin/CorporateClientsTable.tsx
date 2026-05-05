'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Pencil, Trash2 } from 'lucide-react'
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
import type { CorporateClient } from '@/lib/db/queries'

export function CorporateClientsTable({
  clients,
}: {
  clients: CorporateClient[]
}) {
  const t = useTranslations('admin.corporate_clients')
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
      const res = await fetch(`/api/admin/corporate/clients/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_deleted'))
      router.refresh()
    } catch (err) {
      console.error('[CorporateClientsTable/delete]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setBusy(null)
      setPending(null)
    }
  }

  const columns: ColumnDef<CorporateClient>[] = [
    {
      accessorKey: 'logoUrl',
      header: t('logo'),
      cell: ({ row }) => (
        <div className="flex h-9 w-24 items-center justify-start">
          {row.original.logoUrl ? (
            <Image
              src={row.original.logoUrl}
              alt={row.original.name}
              width={96}
              height={36}
              className="h-8 w-auto max-w-[96px] object-contain opacity-80"
            />
          ) : (
            <span className="text-[11px] text-fg3">—</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: t('name'),
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-fg1">{row.original.name}</span>
          {row.original.nameAr && (
            <span dir="rtl" className="text-[11px] text-fg3">
              {row.original.nameAr}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'websiteUrl',
      header: t('website'),
      cell: ({ row }) =>
        row.original.websiteUrl ? (
          <a
            href={row.original.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-accent hover:underline"
          >
            {row.original.websiteUrl.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          '—'
        ),
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
            href={`/admin/corporate/clients/${row.original.id}/edit`}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
            aria-label={tAria('edit_item', { name: row.original.name })}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
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
    <>
      <DataTable columns={columns} data={clients} />
      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tConfirm('delete_corporate_client_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending &&
                tConfirm('delete_corporate_client_body', { name: pending.name })}
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
