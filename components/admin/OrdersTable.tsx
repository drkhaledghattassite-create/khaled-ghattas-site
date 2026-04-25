'use client'

import { useTranslations } from 'next-intl'
import { Eye } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { DataTable, type ColumnDef } from './DataTable'
import { StatusBadge } from './StatusBadge'
import type { Order } from '@/lib/db/queries'

export function OrdersTable({ orders }: { orders: Order[] }) {
  const t = useTranslations('admin.orders')
  const tForms = useTranslations('admin.forms')

  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: 'id',
      header: t('id'),
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-ink-muted">
          {row.original.id.slice(-8).toUpperCase()}
        </span>
      ),
    },
    {
      accessorKey: 'customerEmail',
      header: t('customer'),
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-ink">{row.original.customerName ?? '—'}</span>
          <span className="text-[11px] text-ink-muted">{row.original.customerEmail}</span>
        </div>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: t('total'),
      cell: ({ row }) => `$${row.original.totalAmount}`,
    },
    {
      accessorKey: 'status',
      header: t('status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
        <Link
          href={`/admin/orders/${row.original.id}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-cream-warm/60 hover:text-ink"
          aria-label={tForms('view')}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden />
        </Link>
      ),
    },
  ]

  return <DataTable columns={columns} data={orders} />
}
