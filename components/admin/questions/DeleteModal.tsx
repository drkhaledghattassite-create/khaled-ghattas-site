'use client'

/**
 * Phase B2 — hard-delete confirmation with confirm-word gate.
 *
 * Admin must type the localized confirm word (e.g., "delete" / "حذف") into
 * the input before the destructive button enables. This is the bar for
 * destructive actions per the B2 spec — Archive is the soft path; Delete
 * is reserved for spam/abuse.
 *
 * The confirm word is sourced from translations so it matches the user's
 * locale (typing "delete" in an Arabic UI would feel jarring).
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
import type { AdminQuestionsRow } from './AdminQuestionsPage'

type Props = {
  row: AdminQuestionsRow
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}

export function DeleteModal({ row, pending, onConfirm, onClose }: Props) {
  const t = useTranslations('admin.questions.modal.delete')
  const confirmWord = t('confirm_word')
  const [typed, setTyped] = useState('')
  // Robust match — Arabic doesn't have case, but virtual keyboards and
  // clipboard managers sneak in diacritics, the tatweel kashida (ـ), and
  // invisible bidi marks. Normalising both sides lets the admin type the
  // word naturally regardless of their keyboard's auto-tashkeel settings.
  // For Latin (`"delete"`), `toLocaleLowerCase` covers the case axis.
  const matches = normalizeConfirmWord(typed) === normalizeConfirmWord(confirmWord)

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('body', { subject: row.subject })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="confirm-delete-word"
            className="text-[12px] font-display font-semibold tracking-[0.04em] text-fg2"
          >
            {t('confirm_label', { word: confirmWord })}
          </label>
          <input
            id="confirm-delete-word"
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
          <AlertDialogCancel disabled={pending}>{t('cancel')}</AlertDialogCancel>
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

// Tatweel + every bidi-formatting / zero-width code point we've seen sneak
// in via clipboard managers and virtual keyboards. Built from numeric code
// points (no literal invisibles in the source) so the regex stays auditable
// — a literal RLM/LRM in a character class is unreadable to humans and
// editors render the surrounding code in confusing bidi modes.
const INVISIBLE_CODE_POINTS = [
  0x0640, // tatweel / kashida
  0x200b, // zero-width space
  0x200c, // zero-width non-joiner
  0x200d, // zero-width joiner
  0x200e, // left-to-right mark
  0x200f, // right-to-left mark
  0x202a, // left-to-right embedding
  0x202b, // right-to-left embedding
  0x202c, // pop directional formatting
  0x202d, // left-to-right override
  0x202e, // right-to-left override
  0x2066, // left-to-right isolate
  0x2067, // right-to-left isolate
  0x2068, // first strong isolate
  0x2069, // pop directional isolate
  0xfeff, // zero-width no-break space (BOM mid-string)
]
const STRIP_INVISIBLES = new RegExp(
  '[' + INVISIBLE_CODE_POINTS.map((c) => String.fromCharCode(c)).join('') + ']',
  'g',
)

/**
 * Normalise the confirm-word for comparison. Three transformations, in
 * order, applied to both the typed input and the localized canonical word:
 *
 *   1. Strip every Unicode combining mark (`\p{M}`) — Arabic tashkeel
 *      U+064B–U+0652 + alef khanjariya U+0670 + others. Admins with
 *      auto-tashkeel keyboards on iOS/Android otherwise can't type the
 *      Arabic confirm word without the modal rejecting their input.
 *   2. Strip the invisibles in `INVISIBLE_CODE_POINTS` above.
 *   3. Collapse Unicode whitespace to single spaces, then trim. Catches
 *      accidental spacebar double-taps and autocomplete trailing whitespace
 *      from mobile keyboards.
 *
 * Then `toLocaleLowerCase()` for the Latin case axis. Arabic is caseless so
 * this is a no-op there. We deliberately do NOT normalise alef variants
 * (أ إ آ → ا) or ta marbuta (ة → ه) — for a 3-letter destructive-action
 * confirm word, near-miss spellings should still reject; only typographic
 * noise should pass.
 */
function normalizeConfirmWord(s: string): string {
  return s
    .normalize('NFC')
    .replace(/\p{M}/gu, '')
    .replace(STRIP_INVISIBLES, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase()
}
