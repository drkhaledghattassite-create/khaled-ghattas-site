'use client'

/**
 * Phase B2 — "Mark as answered" modal.
 *
 * Used for both PENDING → ANSWERED and "Edit answer" on already-ANSWERED
 * rows. Shows the question's subject + body excerpt read-only so admin
 * confirms they're answering the right one. Two editable fields:
 *
 *   - Answer body (REQUIRED): the prose reply that ships to the asker via
 *     email and renders on /dashboard/ask. Validator floor is 10 chars.
 *   - Reference URL (OPTIONAL): supplementary link (Instagram reel, YouTube
 *     clip, …) — becomes a CTA inside the email when present.
 *
 * Submit is disabled until the body meets the minimum length, mirroring
 * the `superRefine` rule on `updateQuestionStatusSchema`.
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
import {
  ANSWER_BODY_MAX,
  ANSWER_BODY_MIN,
  ANSWER_REFERENCE_MAX,
} from '@/lib/validators/user-question'
import type { AdminQuestionsRow } from './AdminQuestionsPage'

type Props = {
  row: AdminQuestionsRow
  locale: 'ar' | 'en'
  pending: boolean
  onConfirm: (input: { answerBody: string; answerReference: string }) => void
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
  const [body, setBody] = useState(row.answerBody ?? '')
  const [reference, setReference] = useState(row.answerReference ?? '')
  const trimmedBody = body.trim()
  const trimmedReference = reference.trim()
  const canSubmit =
    trimmedBody.length >= ANSWER_BODY_MIN &&
    trimmedBody.length <= ANSWER_BODY_MAX &&
    trimmedReference.length <= ANSWER_REFERENCE_MAX

  const bodyExcerpt =
    row.body.length > BODY_EXCERPT_LEN
      ? row.body.slice(0, BODY_EXCERPT_LEN - 1) + '…'
      : row.body

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {/* Read-only question summary */}
        <div className="rounded-md border border-border bg-bg-deep p-3.5">
          <div className="text-[11px] font-display font-semibold uppercase tracking-[0.12em] text-fg3">
            {tShared('question_eyebrow')}
          </div>
          <h4 className="mt-1.5 text-[15px] font-bold leading-[1.35] text-fg1 font-arabic-display">
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

        {/* Answer body — the prose reply (required) */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="answer-body"
            className="text-[12px] font-display font-semibold tracking-[0.04em] text-fg2"
          >
            {t('body_label')}
          </label>
          <textarea
            id="answer-body"
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={pending}
            aria-required="true"
            maxLength={ANSWER_BODY_MAX}
            placeholder={t('body_placeholder')}
            className={`w-full resize-y rounded-md border border-border-strong bg-bg-elevated px-3.5 py-2.5 text-[14px] leading-[1.7] text-fg1 outline-none transition-[border-color,box-shadow] focus:border-accent focus:shadow-[var(--shadow-focus)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          />
          <span className="text-[12px] text-fg3 leading-[1.5]">
            {t('body_help')}
          </span>
          <span className="text-[11px] text-fg3 [font-feature-settings:'tnum']">
            {trimmedBody.length} / {ANSWER_BODY_MAX}
          </span>
        </div>

        {/* Optional reference URL */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="answer-reference"
            className="text-[12px] font-display font-semibold tracking-[0.04em] text-fg2"
          >
            {t('reference_label')}
          </label>
          <input
            id="answer-reference"
            type="url"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={pending}
            maxLength={ANSWER_REFERENCE_MAX}
            placeholder={t('reference_placeholder')}
            className="w-full rounded-md border border-border-strong bg-bg-elevated px-3.5 py-2.5 text-[14px] text-fg1 outline-none transition-[border-color,box-shadow] focus:border-accent focus:shadow-[var(--shadow-focus)]"
            dir="ltr"
          />
          <span className="text-[12px] text-fg3 leading-[1.5]">
            {t('reference_help')}
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
            onClick={() =>
              onConfirm({
                answerBody: trimmedBody,
                answerReference: trimmedReference,
              })
            }
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
