'use client'

/**
 * Phase C2 — destructive delete with confirm-word gate.
 *
 * Mirrors the B2 admin/questions DeleteModal: type the localized confirm
 * word ("delete" / "حذف") to enable the destructive button. The body
 * surfaces the question count and the historical attempt count so admins
 * see the destruction scale before confirming.
 *
 * Confirm-word matching uses the same Unicode-normalisation scheme as B2
 * (NFC + strip combining marks + strip invisible bidi marks + collapse
 * whitespace + locale-lower). It's duplicated here rather than extracted
 * into a shared helper because (a) the spec said "reuse the
 * Unicode-normalized confirm-word matching" without mandating extraction
 * and (b) extracting it from one call site to another belongs in a future
 * refactor pass.
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
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
import type { AdminTestRow } from './AdminTestsListPage'

type Props = {
  row: AdminTestRow
  locale: 'ar' | 'en'
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}

export function DeleteTestModal({
  row,
  locale,
  pending,
  onConfirm,
  onClose,
}: Props) {
  const t = useTranslations('admin.tests.modal.delete')
  const tForms = useTranslations('admin.forms')
  const confirmWord = t('confirm_word')
  const [typed, setTyped] = useState('')
  const matches =
    normalizeConfirmWord(typed) === normalizeConfirmWord(confirmWord)
  const title = locale === 'ar' ? row.titleAr : row.titleEn

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('body', {
              title,
              questionCount: row.questionCount,
              attemptCount: row.attemptCount,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="confirm-delete-test-word"
            className="text-[12px] font-display font-semibold tracking-[0.04em] text-fg2"
          >
            {t('confirm_word_label', { word: confirmWord })}
          </label>
          <input
            id="confirm-delete-test-word"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={pending}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-md border border-border-strong bg-bg-elevated px-3 py-2 text-[14px] text-fg1 outline-none transition-[border-color,box-shadow] focus:border-accent focus:shadow-[var(--shadow-focus)]"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {tForms('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!matches || pending}
            variant="destructive"
          >
            {pending && (
              <Loader2 aria-hidden className="me-2 h-3.5 w-3.5 animate-spin" />
            )}
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/* ── Unicode-normalised confirm-word match (mirrors B2). ─────────────── */

const INVISIBLE_CODE_POINTS = [
  0x0640, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c,
  0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069, 0xfeff,
]
const STRIP_INVISIBLES = new RegExp(
  '[' +
    INVISIBLE_CODE_POINTS.map((c) => String.fromCharCode(c)).join('') +
    ']',
  'g',
)

function normalizeConfirmWord(s: string): string {
  return s
    .normalize('NFC')
    .replace(/\p{M}/gu, '')
    .replace(STRIP_INVISIBLES, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase()
}
