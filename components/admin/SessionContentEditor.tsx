'use client'

/**
 * Admin editor for the contents of a paid session.
 *
 * One screen, two surfaces:
 *   - The list (this file): shows each item with type badge, title, duration,
 *     up/down reorder, edit, delete. No DnD library is installed; up/down
 *     arrows are the brief-specified fallback.
 *   - The dialog (SessionContentItemDialog): create or edit a single item.
 *     Validates client-side via zod for instant feedback; the server action
 *     re-validates and is the source of truth.
 *
 * Optimistic mutations:
 *   - Reorder updates local state immediately, then fires the action and
 *     rolls back + toasts on failure (the brief asked for snappy reorder UX).
 *   - Create / update / delete wait for the server response then reconcile
 *     local state (those mutations are dialog-driven so the user already
 *     expects a brief network round-trip; rolling back a create is more
 *     confusing than just showing the spinner).
 *
 * Server-action wiring:
 *   - Each action returns { ok, ... } with a string `code` on failure. The
 *     editor maps codes to translated toasts; unknown codes fall back to a
 *     generic error so we never display a raw enum value to the user.
 */

import { useCallback, useMemo, useState, useTransition } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
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
import { Button } from '@/components/ui/button'
import { StatusBadge } from './StatusBadge'
import { SessionContentItemDialog } from './SessionContentItemDialog'
import {
  createSessionItemAction,
  deleteSessionItemAction,
  reorderSessionItemsAction,
  updateSessionItemAction,
} from '@/app/[locale]/(admin)/admin/books/[id]/content/actions'
import type { SessionItem, SessionItemType } from '@/lib/db/schema'

type Props = {
  sessionId: string
  initialItems: SessionItem[]
}

type DialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; item: SessionItem }

export function SessionContentEditor({ sessionId, initialItems }: Props) {
  const t = useTranslations('admin.session_content')
  const tActions = useTranslations('admin.actions')
  const tConfirm = useTranslations('admin.confirm')
  const [items, setItems] = useState<SessionItem[]>(initialItems)
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' })
  const [pendingDelete, setPendingDelete] = useState<SessionItem | null>(null)
  const [busyItemId, setBusyItemId] = useState<string | null>(null)
  const [, startReorder] = useTransition()

  const errorMessage = useCallback(
    (code: string) => {
      switch (code) {
        case 'UNAUTHORIZED':
        case 'FORBIDDEN':
          return t('error_forbidden')
        case 'NOT_FOUND':
          return t('error_not_found')
        case 'NOT_SESSION':
          return t('error_not_session')
        case 'title-required':
          return t('error_title_required')
        case 'storage-key-required':
          return t('error_storage_key_required')
        case 'duration-required':
          return t('error_duration_required')
        case 'VALIDATION':
          return t('error_validation')
        default:
          return tActions('error_generic')
      }
    },
    [t, tActions],
  )

  async function handleCreate(input: {
    itemType: SessionItemType
    title: string
    description: string | null
    storageKey: string
    durationSeconds: number | null
  }) {
    const result = await createSessionItemAction({ sessionId, ...input })
    if (!result.ok) {
      toast.error(errorMessage(result.code))
      return false
    }
    setItems((prev) => [...prev, result.data])
    toast.success(tActions('success_saved'))
    return true
  }

  async function handleUpdate(
    itemId: string,
    input: {
      itemType: SessionItemType
      title: string
      description: string | null
      storageKey: string
      durationSeconds: number | null
    },
  ) {
    const result = await updateSessionItemAction({
      itemId,
      sessionId,
      ...input,
    })
    if (!result.ok) {
      toast.error(errorMessage(result.code))
      return false
    }
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? result.data : it)),
    )
    toast.success(tActions('success_saved'))
    return true
  }

  async function handleDelete(item: SessionItem) {
    setBusyItemId(item.id)
    try {
      const result = await deleteSessionItemAction({
        itemId: item.id,
        sessionId,
      })
      if (!result.ok) {
        toast.error(errorMessage(result.code))
        return
      }
      setItems((prev) => prev.filter((it) => it.id !== item.id))
      toast.success(tActions('success_deleted'))
    } finally {
      setBusyItemId(null)
      setPendingDelete(null)
    }
  }

  function handleReorder(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const previous = items
    const next = [...items]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved!)
    setItems(next)
    startReorder(async () => {
      const result = await reorderSessionItemsAction({
        sessionId,
        orderedItemIds: next.map((it) => it.id),
      })
      if (!result.ok) {
        // Roll back on failure so the displayed order matches what's
        // actually persisted.
        setItems(previous)
        toast.error(errorMessage(result.code))
      }
    })
  }

  // Map item types to StatusBadge tones — VIDEO=info, AUDIO=warning,
  // PDF=success per the brief. StatusBadge accepts any `status` string and
  // a `tone` override for non-canonical values like the type enum here.
  const typeTone = useMemo(
    () =>
      ({
        VIDEO: 'info',
        AUDIO: 'warning',
        PDF: 'positive',
      }) as const,
    [],
  )

  const editingItem = dialog.mode === 'edit' ? dialog.item : null

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-fg3">
          {t('count', { count: items.length })}
        </p>
        <Button
          type="button"
          onClick={() => setDialog({ mode: 'create' })}
          className="btn-pill btn-pill-primary"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('add')}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-bg-elevated p-10 text-center">
          <p className="text-[14px] text-fg2">{t('empty_title')}</p>
          <p className="mt-1 text-[12px] text-fg3">{t('empty_body')}</p>
        </div>
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-md border border-border bg-bg-elevated">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => handleReorder(index, -1)}
                  disabled={index === 0}
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1 disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label={t('move_up_aria', { title: item.title })}
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => handleReorder(index, 1)}
                  disabled={index === items.length - 1}
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1 disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label={t('move_down_aria', { title: item.title })}
                >
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={item.itemType}
                    tone={typeTone[item.itemType]}
                    label={t(`item_type_${item.itemType.toLowerCase()}`)}
                  />
                  {item.durationSeconds != null &&
                    item.durationSeconds > 0 && (
                      <span className="text-[11px] text-fg3">
                        {formatDuration(item.durationSeconds)}
                      </span>
                    )}
                </div>
                <p className="truncate text-[14px] font-medium text-fg1">
                  {item.title}
                </p>
                <p className="truncate text-[11px] text-fg3" dir="ltr">
                  {item.storageKey}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDialog({ mode: 'edit', item })}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
                  aria-label={t('edit_aria', { title: item.title })}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(item)}
                  disabled={busyItemId === item.id}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-accent/80 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
                  aria-label={t('delete_aria', { title: item.title })}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <SessionContentItemDialog
        key={editingItem?.id ?? 'create'}
        open={dialog.mode !== 'closed'}
        mode={dialog.mode === 'edit' ? 'edit' : 'create'}
        initial={editingItem}
        onClose={() => setDialog({ mode: 'closed' })}
        onSubmit={async (values) => {
          if (dialog.mode === 'edit') {
            return handleUpdate(dialog.item.id, values)
          }
          return handleCreate(values)
        }}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete &&
                t('delete_body', { title: pendingDelete.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyItemId !== null}>
              {tConfirm('delete_cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && handleDelete(pendingDelete)}
              disabled={busyItemId !== null}
              variant="destructive"
            >
              {tConfirm('delete_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return ''
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`
  return `${minutes}:${pad(seconds)}`
}
