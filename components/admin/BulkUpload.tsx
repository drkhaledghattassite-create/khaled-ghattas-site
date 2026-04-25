'use client'

import { useState, type DragEvent } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { UploadCloud, X } from 'lucide-react'

export function BulkUpload() {
  const router = useRouter()
  const t = useTranslations('admin.gallery')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    setFiles((prev) => [...prev, ...dropped])
  }

  function remove(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (files.length === 0) {
      toast.error(t('no_files'))
      return
    }
    console.log(`[admin] would upload ${files.length} photos`)
    await new Promise((r) => setTimeout(r, 400))
    toast.success(tActions('success_uploaded', { count: files.length }))
    router.push('/admin/gallery')
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-md border border-dashed p-12 transition-colors ${dragOver ? 'border-amber bg-amber/10' : 'border-ink/40 bg-cream-soft'}`}
      >
        <UploadCloud className="h-8 w-8 text-ink-muted" aria-hidden />
        <p className="font-label text-[12px] text-ink-muted">{tForms('drag_drop')}</p>
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
            }}
          />
          <span className="font-label inline-flex rounded-full border border-dashed border-ink px-4 py-1.5 text-[11px] text-ink hover:bg-ink hover:text-cream-soft">
            {tForms('browse')}
          </span>
        </label>
      </div>

      {files.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {files.map((file, i) => (
            <li
              key={i}
              className="group relative aspect-square overflow-hidden rounded border border-dashed border-ink/30 bg-cream-warm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, no upload pipeline yet */}
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute end-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-cream-soft/90 text-amber hover:bg-cream-soft"
                aria-label="Remove"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push('/admin/gallery')}
          className="font-label rounded-full border border-dashed border-ink/40 px-4 py-2 text-[12px] text-ink hover:bg-cream-warm/40"
          style={{ letterSpacing: '0.08em' }}
        >
          {tForms('cancel')}
        </button>
        <button
          type="submit"
          disabled={files.length === 0}
          className="font-label rounded-full border border-dashed border-ink bg-ink px-4 py-2 text-[12px] text-cream-soft hover:bg-transparent hover:text-ink disabled:opacity-60"
          style={{ letterSpacing: '0.08em' }}
        >
          {t('upload_count', { count: files.length })}
        </button>
      </div>
    </form>
  )
}
