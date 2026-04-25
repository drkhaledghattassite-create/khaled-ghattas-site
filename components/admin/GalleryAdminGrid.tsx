'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { GalleryItem } from '@/lib/db/queries'

export function GalleryAdminGrid({ gallery }: { gallery: GalleryItem[] }) {
  const t = useTranslations('admin')
  const [filter, setFilter] = useState<string>('all')
  const categories = Array.from(new Set(gallery.map((g) => g.category).filter(Boolean) as string[]))
  const filtered = filter === 'all' ? gallery : gallery.filter((g) => g.category === filter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`font-label rounded-full border border-dashed px-3 py-1 text-[11px] ${filter === 'all' ? 'border-amber bg-amber/10 text-amber' : 'border-ink/30 text-ink hover:border-ink'}`}
        >
          {t('forms.all')}
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`font-label rounded-full border border-dashed px-3 py-1 text-[11px] ${filter === c ? 'border-amber bg-amber/10 text-amber' : 'border-ink/30 text-ink hover:border-ink'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filtered.map((photo) => (
          <li
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded border border-dashed border-ink/30 bg-cream-warm"
          >
            <Image
              src={photo.image}
              alt={photo.titleEn ?? ''}
              fill
              sizes="(min-width: 1024px) 200px, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-ink/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="font-label truncate text-[10px] text-cream-soft">{photo.titleEn ?? '—'}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toast.info('Edit (mock)')}
                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-cream-soft/90 text-ink hover:bg-cream-soft"
                  aria-label="Edit"
                >
                  <Pencil className="h-3 w-3" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => toast.success(t('actions.success_deleted'))}
                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-cream-soft/90 text-amber hover:bg-cream-soft"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
