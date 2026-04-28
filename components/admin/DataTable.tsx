'use client'

import { useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

type Props<T> = {
  columns: ColumnDef<T>[]
  data: T[]
  searchable?: boolean
  pagination?: boolean
  emptyHref?: string
  emptyAction?: React.ReactNode
}

export function DataTable<T>({
  columns,
  data,
  searchable = true,
  pagination = true,
  emptyAction,
}: Props<T>) {
  const t = useTranslations('admin')
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})

  const allColumns: ColumnDef<T>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="select row"
        />
      ),
      enableSorting: false,
    },
    ...columns,
  ]

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const selectedCount = Object.keys(rowSelection).length
  const totalRows = data.length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {searchable && (
          <label className="relative inline-flex items-center">
            <Search className="pointer-events-none absolute start-2.5 h-3.5 w-3.5 text-fg3" aria-hidden />
            <input
              type="search"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={t('forms.search')}
              className="h-9 min-w-[260px] rounded-full border border-border bg-bg-elevated ps-8 pe-4 text-[13px] text-fg1 placeholder:text-fg3 focus:border-accent focus:outline-none"
            />
          </label>
        )}
        {selectedCount > 0 && (
          <span className="text-[11px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
            {selectedCount} / {totalRows} {t('forms.selected')}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-bg-elevated">
        <table className="w-full">
          <thead className="border-b border-border bg-bg-deep">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const sortable = header.column.getCanSort()
                  const sort = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
                      className={cn(
                        'px-3 py-2.5 text-start text-[10px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold',
                        sortable && 'cursor-pointer select-none hover:text-fg1',
                      )}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sort === 'asc' && ' ↑'}
                      {sort === 'desc' && ' ↓'}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={allColumns.length}
                  className="px-4 py-12 text-center text-fg3"
                >
                  <div className="flex flex-col items-center gap-3">
                    <p>{t('empty.title')}</p>
                    {emptyAction}
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-t border-border transition-colors',
                    row.getIsSelected() ? 'bg-accent-soft' : 'hover:bg-bg-deep',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 text-[13px] text-fg1">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
            {t('pagination.page', {
              current: table.getState().pagination.pageIndex + 1,
              total: table.getPageCount(),
            })}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label={t('pagination.previous')}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-fg3 transition-colors hover:bg-bg-deep hover:text-fg1 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label={t('pagination.next')}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-fg3 transition-colors hover:bg-bg-deep hover:text-fg1 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export type { ColumnDef } from '@tanstack/react-table'
