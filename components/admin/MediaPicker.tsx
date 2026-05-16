'use client'

/**
 * MediaPicker — Phase F4.
 *
 * Companion to `StorageKeyUploadField`: opens a dialog that lists every R2
 * object already under the given context prefix and lets the admin pick one
 * with a click. The picked key is handed back through `onSelect`, which
 * `StorageKeyUploadField` wires straight to the form's `onChange`.
 *
 * Why this exists alongside the content-hash dedup on the upload route:
 *   - Dedup is reactive — it short-circuits a wasted PUT when the same bytes
 *     are re-uploaded.
 *   - The picker is proactive — admins reuse a previously-uploaded asset
 *     without ever touching the file-picker. No hashing, no transfer, just
 *     a `<context>/<uuid>/<slug>` key copied into the column.
 *
 * Layout:
 *   - Public/image contexts (book-cover, gallery-image, etc.) render a grid
 *     of thumbnails using the unsigned CDN URL the API returns.
 *   - Private contexts (session-item-video, book-digital-file, etc.) render
 *     a list with filename + size + relative timestamp + an icon. No
 *     thumbnails — the API doesn't sign per-item URLs for performance.
 *
 * Accessibility:
 *   - Dialog has a real title + description, so screen readers announce
 *     context on open.
 *   - Each item is a `<button>` so keyboard nav works without extra ARIA.
 *   - The search input is labelled and the result list has aria-live so
 *     filter results are announced.
 */

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Music,
  RotateCw,
  Search,
  Video,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { isPublicContext, type UploadContext } from '@/lib/validators/storage'

type ListedItem = {
  key: string
  filename: string
  size: number
  lastModified: string
  previewUrl: string | null
}

type ListResponse =
  | {
      ok: true
      bucket: 'public' | 'private'
      items: ListedItem[]
      count: number
      truncated: boolean
    }
  | {
      ok: false
      error: { code: string; message: string }
    }

type Props = {
  context: UploadContext
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (key: string) => void
  /** Optional — the current value of the form field. When provided, the
   * matching item in the list is highlighted as "currently selected." */
  currentValue?: string
}

const MB = 1024 * 1024
const KB = 1024

function formatSize(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`
  if (bytes >= KB) return `${Math.round(bytes / KB)} KB`
  return `${bytes} B`
}

function formatRelative(iso: string, locale: 'en' | 'ar'): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffSec = Math.round((now - then) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (diffSec < 60) return rtf.format(-diffSec, 'second')
  if (diffSec < 3600) return rtf.format(-Math.round(diffSec / 60), 'minute')
  if (diffSec < 86400) return rtf.format(-Math.round(diffSec / 3600), 'hour')
  if (diffSec < 86400 * 30) return rtf.format(-Math.round(diffSec / 86400), 'day')
  if (diffSec < 86400 * 365)
    return rtf.format(-Math.round(diffSec / (86400 * 30)), 'month')
  return rtf.format(-Math.round(diffSec / (86400 * 365)), 'year')
}

function IconForContext({ context }: { context: UploadContext }) {
  if (context.includes('video')) return <Video className="h-5 w-5" aria-hidden />
  if (context.includes('audio')) return <Music className="h-5 w-5" aria-hidden />
  if (context.includes('pdf') || context.includes('digital-file'))
    return <FileText className="h-5 w-5" aria-hidden />
  return <ImageIcon className="h-5 w-5" aria-hidden />
}

export function MediaPicker({
  context,
  open,
  onOpenChange,
  onSelect,
  currentValue,
}: Props) {
  const t = useTranslations('admin.upload')
  const rawLocale = useLocale()
  const locale: 'en' | 'ar' = rawLocale === 'ar' ? 'ar' : 'en'

  const [items, setItems] = useState<ListedItem[]>([])
  const [bucket, setBucket] = useState<'public' | 'private' | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  // Bumped by the retry button so the fetch effect re-runs. Has to be state,
  // not a ref — refs don't trigger re-renders or re-fire effects.
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!open) return

    setItems([])
    setBucket(null)
    setTruncated(false)
    setErrorMessage(null)
    setSearch('')
    setLoading(true)

    const ctrl = new AbortController()

    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/storage/list?context=${encodeURIComponent(context)}`,
          { signal: ctrl.signal },
        )
        const data = (await res.json().catch(() => null)) as ListResponse | null
        if (!data) {
          setErrorMessage(t('picker_error'))
          setLoading(false)
          return
        }
        if (!data.ok) {
          setErrorMessage(data.error.message || t('picker_error'))
          setLoading(false)
          return
        }
        setItems(data.items)
        setBucket(data.bucket)
        setTruncated(data.truncated)
        setLoading(false)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.error('[MediaPicker] list fetch failed', err)
        setErrorMessage(t('picker_error'))
        setLoading(false)
      }
    })()

    return () => {
      ctrl.abort()
    }
  }, [open, context, reloadKey, t])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => it.filename.toLowerCase().includes(q))
  }, [items, search])

  const isImageContext = isPublicContext(context)

  function handleSelect(item: ListedItem) {
    onSelect(item.key)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{t('picker_title')}</DialogTitle>
          <DialogDescription>
            {t('picker_description', { context })}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg3"
            aria-hidden
          />
          <Input
            type="search"
            placeholder={t('picker_search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
            aria-label={t('picker_search_aria')}
          />
        </div>

        <div
          className="max-h-[60vh] overflow-y-auto rounded-md border border-border bg-bg-deep/30"
          aria-live="polite"
          aria-busy={loading}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-fg3">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <p className="text-sm">{t('picker_loading')}</p>
            </div>
          ) : errorMessage ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12">
              <p className="text-sm text-fg2">{errorMessage}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReloadKey((n) => n + 1)}
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden />
                <span className="ms-1.5">{t('picker_retry')}</span>
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-fg3">
              <IconForContext context={context} />
              <p className="text-sm">
                {search.trim() ? t('picker_no_results') : t('picker_empty')}
              </p>
            </div>
          ) : isImageContext ? (
            <ImageGrid
              items={filtered}
              currentValue={currentValue}
              onSelect={handleSelect}
              selectLabel={t('picker_select')}
              currentLabel={t('picker_current')}
              locale={locale}
            />
          ) : (
            <FileList
              items={filtered}
              currentValue={currentValue}
              onSelect={handleSelect}
              context={context}
              currentLabel={t('picker_current')}
              locale={locale}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-fg3">
          <span>
            {bucket
              ? t('picker_bucket_label', {
                  bucket:
                    bucket === 'public' ? t('bucket_public') : t('bucket_private'),
                })
              : ' '}
          </span>
          <span>
            {truncated
              ? t('picker_truncated', { count: items.length })
              : items.length > 0
                ? t('picker_count', {
                    count: filtered.length,
                    total: items.length,
                  })
                : ' '}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ImageGrid({
  items,
  currentValue,
  onSelect,
  selectLabel,
  currentLabel,
  locale,
}: {
  items: ListedItem[]
  currentValue?: string
  onSelect: (item: ListedItem) => void
  selectLabel: string
  currentLabel: string
  locale: 'en' | 'ar'
}) {
  return (
    <ul className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => {
        const isCurrent = currentValue === item.key
        return (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className={`group flex w-full flex-col gap-1 overflow-hidden rounded-md border bg-bg p-1 text-start transition-colors hover:border-accent hover:bg-accent-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isCurrent ? 'border-accent ring-1 ring-accent' : 'border-border'
              }`}
              aria-label={`${selectLabel} ${item.filename}`}
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-bg-deep">
                {item.previewUrl ? (
                  <Image
                    src={item.previewUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 180px"
                    className="object-cover transition-transform group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-fg3">
                    <ImageIcon className="h-5 w-5" aria-hidden />
                  </div>
                )}
                {isCurrent ? (
                  <span className="absolute end-1 top-1 rounded-pill bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-fg">
                    {currentLabel}
                  </span>
                ) : null}
              </div>
              <p className="truncate text-[11px] text-fg1" dir="ltr">
                {item.filename}
              </p>
              <p className="text-[10px] text-fg3" dir="ltr">
                {formatSize(item.size)} · {formatRelative(item.lastModified, locale)}
              </p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function FileList({
  items,
  currentValue,
  onSelect,
  context,
  currentLabel,
  locale,
}: {
  items: ListedItem[]
  currentValue?: string
  onSelect: (item: ListedItem) => void
  context: UploadContext
  currentLabel: string
  locale: 'en' | 'ar'
}) {
  return (
    <ul className="flex flex-col p-1">
      {items.map((item) => {
        const isCurrent = currentValue === item.key
        return (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className={`flex w-full items-center gap-3 rounded-md p-2 text-start transition-colors hover:bg-accent-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isCurrent ? 'bg-accent-soft/50' : ''
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-deep text-fg2">
                <IconForContext context={context} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[13px] font-medium text-fg1"
                  dir="ltr"
                >
                  {item.filename}
                </p>
                <p className="text-[11px] text-fg3" dir="ltr">
                  {formatSize(item.size)} · {formatRelative(item.lastModified, locale)}
                </p>
              </div>
              {isCurrent ? (
                <span className="rounded-pill bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-fg">
                  {currentLabel}
                </span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
