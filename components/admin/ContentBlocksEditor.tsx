'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Plus, Save } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { ContentBlock } from '@/lib/db/queries'

type Draft = { key: string; valueAr: string; valueEn: string; description: string | null }

const SUGGESTED = [
  'hero.headline.ar',
  'hero.headline.en',
  'hero.cta.articles',
  'hero.cta.books',
  'footer.copyright',
  'contact.address',
  'contact.email',
  'about.intro',
] as const

export function ContentBlocksEditor({ blocks }: { blocks: ContentBlock[] }) {
  const t = useTranslations('admin.content_blocks')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const [drafts, setDrafts] = useState<Draft[]>(
    blocks.map((b) => ({
      key: b.key,
      valueAr: b.valueAr,
      valueEn: b.valueEn,
      description: b.description,
    })),
  )
  const [newKey, setNewKey] = useState('')

  function update(idx: number, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)))
  }

  async function save(idx: number) {
    const draft = drafts[idx]
    if (!draft) return
    try {
      const res = await fetch(
        `/api/admin/content-blocks/${encodeURIComponent(draft.key)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            valueAr: draft.valueAr,
            valueEn: draft.valueEn,
            description: draft.description,
          }),
        },
      )
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_saved'))
    } catch (err) {
      console.error('[ContentBlocksEditor/save]', err)
      toast.error(tActions('error_generic'))
    }
  }

  async function addBlock(key: string) {
    const trimmed = key.trim()
    if (!trimmed) return
    if (drafts.some((d) => d.key === trimmed)) {
      setNewKey('')
      return
    }
    try {
      const res = await fetch('/api/admin/content-blocks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: trimmed, valueAr: '', valueEn: '', description: null }),
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      setDrafts((prev) => [
        ...prev,
        { key: trimmed, valueAr: '', valueEn: '', description: null },
      ])
      setNewKey('')
      toast.success(tActions('success_saved'))
    } catch (err) {
      console.error('[ContentBlocksEditor/addBlock]', err)
      toast.error(tActions('error_generic'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[260px]">
          <Label className="font-label text-[11px] text-fg3">{t('new_key')}</Label>
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="hero.headline.ar"
          />
        </div>
        <button
          type="button"
          onClick={() => addBlock(newKey)}
          className="font-label inline-flex items-center gap-1.5 rounded-full border border-dashed border-fg1 bg-fg1 px-4 py-2 text-[12px] text-bg hover:bg-transparent hover:text-fg1"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('add_block')}
        </button>
      </div>

      {drafts.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-bg-elevated p-5">
          <p className="font-label text-[11px] text-fg3">{t('suggested')}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {SUGGESTED.map((k) => (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => addBlock(k)}
                  className="font-label rounded-full border border-dashed border-border px-3 py-1 text-[11px] text-fg1 hover:border-accent hover:bg-accent-soft hover:text-accent"
                >
                  {k}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="space-y-4">
        {drafts.map((d, i) => (
          <li key={d.key} className="rounded-md border border-dashed border-border bg-bg-elevated p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <code className="font-mono text-[12px] text-accent">{d.key}</code>
              <button
                type="button"
                onClick={() => save(i)}
                className="font-label inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-[11px] text-fg1 hover:bg-fg1 hover:text-bg"
              >
                <Save className="h-3 w-3" aria-hidden />
                {tForms('save')}
              </button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <Label className="font-label text-[10px] text-fg3">value_ar</Label>
                <Textarea
                  rows={3}
                  value={d.valueAr}
                  dir="rtl"
                  onChange={(e) => update(i, { valueAr: e.target.value })}
                />
              </div>
              <div>
                <Label className="font-label text-[10px] text-fg3">value_en</Label>
                <Textarea
                  rows={3}
                  value={d.valueEn}
                  onChange={(e) => update(i, { valueEn: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3">
              <Label className="font-label text-[10px] text-fg3">{t('description')}</Label>
              <Input
                value={d.description ?? ''}
                onChange={(e) => update(i, { description: e.target.value || null })}
                placeholder={t('description_placeholder')}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
