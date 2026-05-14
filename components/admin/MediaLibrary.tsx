'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import type { GalleryItem } from '@/lib/db/queries'

// Read-only browse surface. Upload + per-asset delete buttons were removed —
// the storage pipeline (Vercel Blob / Uploadthing) isn't wired yet; admin
// forms accept URLs and CRUD lives on the underlying content tables (gallery,
// books, articles, ...). The earlier UI also synthesised fake file sizes
// and dimensions; both are gone here. URL-copy remains because it's the one
// real action this surface supports today.
type Asset = {
  id: string
  filename: string
  url: string
}

export function MediaLibrary({ gallery }: { gallery: GalleryItem[] }) {
  const t = useTranslations('admin.media')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const [filter, setFilter] = useState<'all' | 'image' | 'pdf' | 'video'>('all')

  const assets: Asset[] = gallery.map((g) => ({
    id: g.id,
    filename: g.image.split('/').pop() ?? 'asset',
    url: g.image,
  }))

  function copy(url: string) {
    if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
      navigator.clipboard.writeText(url)
      toast.success(tActions('url_copied'))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {(['all', 'image', 'pdf', 'video'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`font-label rounded-full border border-dashed px-3 py-1 text-[11px] ${filter === f ? 'border-accent bg-accent-soft text-accent' : 'border-border text-fg1 hover:border-fg1'}`}
            >
              {t(`filter.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {assets.map((a) => (
          <li
            key={a.id}
            className="group flex flex-col rounded-md border border-dashed border-border bg-bg-elevated"
          >
            <div className="relative aspect-square overflow-hidden bg-bg-deep">
              <Image src={a.url} alt="" fill sizes="200px" className="object-cover" />
            </div>
            <div className="flex items-center justify-between gap-2 p-2 text-[10px]">
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-fg1">{a.filename}</span>
              </div>
              <button
                type="button"
                onClick={() => copy(a.url)}
                aria-label={tForms('copy_url')}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
              >
                <Copy className="h-3 w-3" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
