'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type ColumnDef } from './DataTable'
import { StatusBadge } from './StatusBadge'
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
import type { User, UserRole } from '@/lib/db/queries'

const ROLES: UserRole[] = ['USER', 'ADMIN', 'CLIENT']

export function UsersPanel({ users }: { users: User[] }) {
  const t = useTranslations('admin.users')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const [editing, setEditing] = useState<User | null>(null)
  const [draftRole, setDraftRole] = useState<UserRole>('USER')

  function openEdit(u: User) {
    setEditing(u)
    setDraftRole(u.role)
  }

  function save() {
    if (!editing) return
    console.log(`[admin] would update user ${editing.id} role to ${draftRole}`)
    toast.success(tActions('success_saved'))
    setEditing(null)
  }

  const columns: ColumnDef<User>[] = [
    {
      id: 'avatar',
      header: '',
      enableSorting: false,
      cell: () => <span aria-hidden className="block h-8 w-8 rounded-full bg-ink/80" />,
    },
    {
      accessorKey: 'name',
      header: t('name'),
      cell: ({ row }) => row.original.name ?? '—',
    },
    { accessorKey: 'email', header: t('email') },
    {
      accessorKey: 'role',
      header: t('role'),
      cell: ({ row }) => <StatusBadge status={row.original.role} />,
    },
    {
      accessorKey: 'createdAt',
      header: t('created_at'),
      cell: ({ row }) => row.original.createdAt.toISOString().slice(0, 10),
    },
    {
      id: 'actions',
      header: tForms('actions'),
      enableSorting: false,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => openEdit(row.original)}
          aria-label={t('edit_role')}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-cream-warm/60 hover:text-ink"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
      ),
    },
  ]

  return (
    <>
      <div className="space-y-5">
        <p className="text-[13px] text-ink-muted">{t('description')}</p>
        <DataTable columns={columns} data={users} />
      </div>

      <AlertDialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('edit_role')}</AlertDialogTitle>
            <AlertDialogDescription>
              {editing?.email} — {t('confirm_role')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <fieldset className="space-y-2">
            {ROLES.map((r) => (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-ink/30 px-3 py-2 text-[13px] hover:border-ink"
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={draftRole === r}
                  onChange={() => setDraftRole(r)}
                />
                <span>{r}</span>
              </label>
            ))}
          </fieldset>
          <AlertDialogFooter>
            <AlertDialogCancel>{tForms('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={save}>{tForms('save')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
