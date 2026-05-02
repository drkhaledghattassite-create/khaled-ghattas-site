'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from '@/lib/i18n/navigation'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GalleryItem } from '@/lib/db/queries'

type EditDraft = {
  id: string
  titleAr: string
  titleEn: string
  category: string
}

export function GalleryAdminGrid({ gallery }: { gallery: GalleryItem[] }) {
  const t = useTranslations('admin')
  const tConfirm = useTranslations('admin.confirm')
  const tAria = useTranslations('admin.aria')
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditDraft | null>(null)
  const [saving, setSaving] = useState(false)
  // Pending delete target — replaces native confirm() with a styled AlertDialog
  // matching the rest of admin (see ArticlesTable for the same pattern).
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const categories = Array.from(
    new Set(gallery.map((g) => g.category).filter(Boolean) as string[]),
  )
  const filtered =
    filter === 'all' ? gallery : gallery.filter((g) => g.category === filter)

  async function handleDelete(id: string) {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error(t('actions.error_generic'))
        return
      }
      toast.success(t('actions.success_deleted'))
      router.refresh()
    } catch (err) {
      console.error('[GalleryAdminGrid/delete]', err)
      toast.error(t('actions.error_generic'))
    } finally {
      setBusy(null)
      setPendingDelete(null)
    }
  }

  function openEdit(item: GalleryItem) {
    setEditing({
      id: item.id,
      titleAr: item.titleAr ?? '',
      titleEn: item.titleEn ?? '',
      category: item.category ?? '',
    })
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/gallery/${editing.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          titleAr: editing.titleAr || null,
          titleEn: editing.titleEn || null,
          category: editing.category || null,
        }),
      })
      if (!res.ok) {
        toast.error(t('actions.error_generic'))
        return
      }
      toast.success(t('actions.success_saved'))
      setEditing(null)
      router.refresh()
    } catch (err) {
      console.error('[GalleryAdminGrid/save]', err)
      toast.error(t('actions.error_generic'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
            filter === 'all'
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-border text-fg1 hover:border-fg1'
          }`}
        >
          {t('forms.all')}
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
              filter === c
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-border text-fg1 hover:border-fg1'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filtered.map((photo) => (
          <li
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded border border-border bg-bg-elevated"
          >
            <Image
              src={photo.image}
              alt={photo.titleEn ?? ''}
              fill
              sizes="(min-width: 1024px) 200px, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-fg1/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="truncate text-[10px] text-bg-elevated font-semibold uppercase tracking-[0.08em]">
                {photo.titleEn ?? '—'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(photo)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-bg-elevated/90 text-fg1 hover:bg-bg-elevated"
                  aria-label={t('forms.edit')}
                >
                  <Pencil className="h-3 w-3" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={busy === photo.id}
                  onClick={() => setPendingDelete(photo.id)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-bg-elevated/90 text-accent hover:bg-bg-elevated disabled:opacity-60"
                  aria-label={tAria('delete_item', {
                    name: photo.titleEn ?? photo.titleAr ?? 'photo',
                  })}
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <AlertDialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('forms.edit')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('gallery.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div>
                <Label className="font-label text-[11px] text-fg3">title_ar</Label>
                <Input
                  value={editing.titleAr}
                  onChange={(e) => setEditing({ ...editing, titleAr: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div>
                <Label className="font-label text-[11px] text-fg3">title_en</Label>
                <Input
                  value={editing.titleEn}
                  onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })}
                />
              </div>
              <div>
                <Label className="font-label text-[11px] text-fg3">category</Label>
                <Input
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  placeholder="lectures, library, …"
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t('forms.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={saveEdit} disabled={saving}>
              {saving ? t('forms.saving') : t('forms.save')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete-confirm dialog — replaces the previous native confirm() prompt. */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm('delete_gallery_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm('delete_gallery_body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>
              {tConfirm('delete_cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && handleDelete(pendingDelete)}
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
