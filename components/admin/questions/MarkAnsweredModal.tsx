'use client'

/**
 * Phase B2 — "Mark as answered" modal.
 *
 * Used for both PENDING → ANSWERED and "Edit answer" on already-ANSWERED
 * rows. Shows the question's subject + body excerpt read-only so admin
 * confirms they're answering the right one. The single editable field is
 * the answer reference (URL or free-text note).
 *
 * The reference is OPTIONAL at the input level — the form's submit button
 * is disabled when the trimmed value is empty, mirroring the
 * `superRefine` rule on `updateQuestionStatusSchema`.
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ANSWER_REFERENCE_MAX } from '@/lib/validators/user-question'
import type { AdminQuestionsRow } from './AdminQuestionsPage'

type Props = {
  row: AdminQuestionsRow
  locale: 'ar' | 'en'
  pending: boolean
  onConfirm: (answerReference: string) => void
  onClose: () => void
}

const BODY_EXCERPT_LEN = 240

export function MarkAnsweredModal({
  row,
  locale,
  pending,
  onConfirm,
  onClose,
}: Props) {
  const t = useTranslations('admin.questions.modal.mark_answered')
  const tShared = useTranslations('admin.questions.modal.shared')
  const tForms = useTranslations('admin.forms')
  const isRtl = locale === 'ar'
  const [value, setValue] = useState(row.answerReference ?? '')
  const trimmed = value.trim()
  const canSubmit = trimmed.length > 0 && trimmed.length <= ANSWER_REFERENCE_MAX

  const bodyExcerpt =
    row.body.length > BODY_EXCERPT_LEN
      ? row.body.slice(0, BODY_EXCERPT_LEN - 1) + '…'
      : row.body

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {/* Read-only question summary */}
        <div className="rounded-md border border-border bg-bg-deep p-3.5">
          <div className="text-[11px] font-display font-semibold uppercase tracking-[0.12em] text-fg3">
            {tShared('question_eyebrow')}
          </div>
          <h4
            className={`mt-1.5 text-[15px] font-bold leading-[1.35] text-fg1 ${
              isRtl ? 'font-arabic-display' : 'font-arabic-display'
            }`}
          >
            {row.subject}
          </h4>
          <p
            className={`mt-2 text-[13px] leading-[1.7] text-fg2 ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {bodyExcerpt}
          </p>
        </div>

        {/* Reference input */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="answer-reference"
            className="text-[12px] font-display font-semibold tracking-[0.04em] text-fg2"
          >
            {t('reference_label')}
          </label>
          <textarea
            id="answer-reference"
            rows={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={pending}
            maxLength={ANSWER_REFERENCE_MAX}
            placeholder={t('reference_placeholder')}
            className="w-full resize-y rounded-md border border-border-strong bg-bg-elevated px-3.5 py-2.5 text-[14px] text-fg1 outline-none transition-[border-color,box-shadow] focus:border-accent focus:shadow-[var(--shadow-focus)]"
          />
          <span className="text-[12px] text-fg3 leading-[1.5]">
            {t('reference_help')}
          </span>
          <span className="text-[11px] text-fg3 [font-feature-settings:'tnum']">
            {trimmed.length} / {ANSWER_REFERENCE_MAX}
          </span>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn-pill btn-pill-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {tForms('cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trimmed)}
            disabled={!canSubmit || pending}
            className="btn-pill btn-pill-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending && (
              <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
            )}
            {t('submit')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
