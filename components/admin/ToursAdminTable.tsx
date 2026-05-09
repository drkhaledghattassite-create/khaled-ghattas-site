'use client'

import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
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
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { DataTable, type ColumnDef } from './DataTable'
import { StatusBadge } from './StatusBadge'
import {
  deleteTourAction,
  toggleTourActiveAction,
} from '@/app/[locale]/(admin)/admin/booking/actions'
import type { Tour } from '@/lib/db/queries'

type Filter = 'all' | 'upcoming' | 'past'

export function ToursAdminTable({ tours }: { tours: Tour[] }) {
  const t = useTranslations('admin.booking_tours')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.booking_actions')
  const tConfirm = useTranslations('admin.booking_confirm')
  const tAria = useTranslations('admin.aria')
  const locale = useLocale()
  const router = useRouter()

  const [filter, setFilter] = useState<Filter>('all')
  const [pending, setPending] = useState<{ id: string; name: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
        dateStyle: 'medium',
      }),
    [locale],
  )

  const filtered = useMemo(() => {
    if (filter === 'all') return tours
    const now = Date.now()
    return tours.filter((tour) => {
      const ts = tour.date.getTime()
      return filter === 'upcoming' ? ts >= now : ts < now
    })
  }, [tours, filter])

  async function handleDelete(id: string) {
    setBusy(id)
    try {
      const result = await deleteTourAction(id)
      if (!result.ok) {
        toast.error(tActions(`error_${result.error}` as 'error_db_failed'))
        return
      }
      toast.success(tActions('success_deleted'))
      router.refresh()
    } catch (err) {
      console.error('[ToursAdminTable/delete]', err)
      toast.error(tActions('error_db_failed'))
    } finally {
      setBusy(null)
      setPending(null)
    }
  }

  function handleToggleActive(id: string, next: boolean) {
    startTransition(async () => {
      const result = await toggleTourActiveAction(id, next)
      if (!result.ok) {
        toast.error(tActions(`error_${result.error}` as 'error_db_failed'))
        return
      }
      toast.success(tActions('success_saved'))
      router.refresh()
    })
  }

  const columns: ColumnDef<Tour>[] = [
    {
      id: 'cover',
      header: t('col_cover'),
      enableSorting: false,
      cell: ({ row }) => {
        const src = row.original.coverImage
        const alt = locale === 'ar' ? row.original.titleAr : row.original.titleEn
        return (
          <span className="relative block h-14 w-10 overflow-hidden rounded border border-border bg-bg-deep">
            {src ? (
              <Image src={src} alt={alt} fill sizes="40px" className="object-cover" />
            ) : null}
          </span>
        )
      },
    },
    {
      accessorKey: 'titleEn',
      header: t('col_title'),
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-fg1">{row.original.titleEn}</span>
          <span dir="rtl" className="text-[11px] text-fg3">
            {row.original.titleAr}
          </span>
        </div>
      ),
    },
    {
      id: 'city',
      header: t('col_city'),
      cell: ({ row }) => {
        const city = locale === 'ar' ? row.original.cityAr : row.original.cityEn
        const country =
          locale === 'ar' ? row.original.countryAr : row.original.countryEn
        return (
          <div className="flex flex-col leading-tight">
            <span className="text-fg1">{city}</span>
            <span className="text-[11px] text-fg3">{country}</span>
          </div>
        )
      },
    },
    {
      id: 'date',
      header: t('col_date'),
      cell: ({ row }) => {
        const isPast = row.original.date.getTime() < Date.now()
        return (
          <div className="flex items-center gap-2">
            <span className={cn(locale === 'en' && 'num-latn')}>
              {dateFmt.format(row.original.date)}
            </span>
            <StatusBadge
              status={isPast ? 'PAST' : 'UPCOMING'}
              label={isPast ? t('pill_past') : t('pill_upcoming')}
            />
          </div>
        )
      },
    },
    {
      id: 'externalUrl',
      header: t('col_external_url'),
      enableSorting: false,
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.externalBookingUrl ? 'ACTIVE' : 'DRAFT'}
          tone={row.original.externalBookingUrl ? 'positive' : 'neutral'}
          label={
            row.original.externalBookingUrl ? t('url_set') : t('url_unset')
          }
        />
      ),
    },
    {
      id: 'isActive',
      header: t('col_active'),
      enableSorting: false,
      cell: ({ row }) => (
        <Switch
          checked={row.original.isActive}
          onCheckedChange={(next) => handleToggleActive(row.original.id, next)}
          aria-label={tAria('edit_item', {
            name: row.original.titleEn || row.original.slug,
          })}
        />
      ),
    },
    {
      id: 'actions',
      header: t('col_actions'),
      enableSorting: false,
      cell: ({ row }) => {
        const displayName =
          row.original.titleEn || row.original.titleAr || row.original.slug
        return (
          <div className="flex items-center gap-1">
            <Link
              href={`/admin/booking/tours/${row.original.id}/edit`}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
              aria-label={tAria('edit_item', { name: displayName })}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <button
              type="button"
              disabled={busy === row.original.id}
              onClick={() => setPending({ id: row.original.id, name: displayName })}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-accent/80 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
              aria-label={tAria('delete_item', { name: displayName })}
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
      <FilterChips current={filter} onChange={setFilter} />
      <DataTable columns={columns} data={filtered} />
      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm('delete_tour_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && tConfirm('delete_tour_body', { title: pending.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>
              {tForms('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pending && handleDelete(pending.id)}
              disabled={busy !== null}
              variant="destructive"
            >
              {tConfirm('delete_tour_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function FilterChips({
  current,
  onChange,
}: {
  current: Filter
  onChange: (next: Filter) => void
}) {
  const t = useTranslations('admin.booking_tours')
  const items: { key: Filter; label: string }[] = [
    { key: 'all', label: t('filter_all') },
    { key: 'upcoming', label: t('filter_upcoming') },
    { key: 'past', label: t('filter_past') },
  ]
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-elevated p-1">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={cn(
            'rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.08em] font-display font-semibold transition-colors',
            current === item.key
              ? 'bg-fg1 text-bg'
              : 'text-fg3 hover:text-fg1',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
