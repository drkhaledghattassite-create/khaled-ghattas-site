'use client'

/**
 * Phase B2 — orchestrator for /admin/questions.
 *
 * Owns the modal state machine (which row is being acted on, with which
 * action) and the URL-query-param binding for status + page. Filter-change
 * + pagination push to the URL so admins can share/refresh links.
 *
 * Status transitions go through the `updateQuestionStatusAction`; a delete
 * goes through `deleteQuestionAction`. Toast feedback matches the spec's
 * three-way email outcome (queued / text-note / failed).
 */

import { useCallback, useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  deleteQuestionAction,
  updateQuestionStatusAction,
  type UpdateQuestionStatusActionResult,
} from '@/app/[locale]/(admin)/admin/questions/actions'
import { QUESTION_STATUSES } from '@/lib/validators/user-question'
import type { QuestionStatus } from '@/lib/db/schema'
import { QuestionsTable } from './QuestionsTable'
import { MarkAnsweredModal } from './MarkAnsweredModal'
import { ArchiveModal } from './ArchiveModal'
import { RevertModal } from './RevertModal'
import { DeleteModal } from './DeleteModal'

export type AdminQuestionsRow = {
  id: string
  subject: string
  body: string
  category: string | null
  isAnonymous: boolean
  status: QuestionStatus
  answerReference: string | null
  answeredAt: string | null
  archivedAt: string | null
  createdAt: string
  // Nullable — orphan-user case (asker row missing despite cascade FK).
  // Components that render asker identity must handle null explicitly.
  user: { id: string; name: string | null; email: string } | null
}

type FilterValue = QuestionStatus | 'all'

type ActiveModal =
  | { type: 'mark_answered'; row: AdminQuestionsRow }
  | { type: 'archive'; row: AdminQuestionsRow }
  | { type: 'revert'; row: AdminQuestionsRow }
  | { type: 'delete'; row: AdminQuestionsRow }
  | null

type Props = {
  rows: AdminQuestionsRow[]
  total: number
  page: number
  pageSize: number
  statusFilter: FilterValue
  categoryFilter: string | 'all'
  // Distinct categories surfaced from the data (top-N by COUNT). Vocabulary
  // is free-text on user_questions.category, so the filter is dynamic — empty
  // arrays hide the dropdown entirely.
  categoryOptions: string[]
  locale: 'ar' | 'en'
}

export function AdminQuestionsPage({
  rows,
  total,
  page,
  pageSize,
  statusFilter,
  categoryFilter,
  categoryOptions,
  locale,
}: Props) {
  const t = useTranslations('admin.questions')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState<ActiveModal>(null)
  const [pending, startTransition] = useTransition()

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const setQuery = useCallback(
    (next: { status?: FilterValue; category?: string | 'all'; page?: number }) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next.status !== undefined) {
        if (next.status === 'all') params.delete('status')
        else params.set('status', next.status)
        // Reset to page 1 on filter change — paging through a filter that
        // changed leaves admin on a possibly-empty page otherwise.
        params.delete('page')
      }
      if (next.category !== undefined) {
        if (next.category === 'all') params.delete('category')
        else params.set('category', next.category)
        params.delete('page')
      }
      if (next.page !== undefined) {
        if (next.page === 1) params.delete('page')
        else params.set('page', String(next.page))
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const handleFilter = useCallback(
    (status: FilterValue) => setQuery({ status }),
    [setQuery],
  )
  const handleCategory = useCallback(
    (category: string | 'all') => setQuery({ category }),
    [setQuery],
  )
  const handlePage = useCallback(
    (next: number) => setQuery({ page: next }),
    [setQuery],
  )

  const closeModal = useCallback(() => {
    if (!pending) setActive(null)
  }, [pending])

  /* ── Action runners ──────────────────────────────────────────── */

  const runStatusUpdate = useCallback(
    (
      row: AdminQuestionsRow,
      target: QuestionStatus,
      answerReference: string | undefined,
    ) => {
      startTransition(async () => {
        try {
          const res: UpdateQuestionStatusActionResult =
            await updateQuestionStatusAction({
              id: row.id,
              status: target,
              answerReference,
            })
          if (res.ok) {
            // Five-way toast for the ANSWERED transition driven by the
            // server's emailOutcome discriminator; one-liner otherwise.
            if (target === 'ANSWERED') {
              switch (res.emailOutcome) {
                case 'sent':
                  toast.success(t('toast.answered_with_email'))
                  break
                case 'no_url':
                  toast.success(t('toast.answered_text_note'))
                  break
                case 'no_recipient':
                  // Asker account no longer exists — status updated, no
                  // one to notify. Rare in practice (cascade FK).
                  toast.warning(t('toast.answered_no_recipient'))
                  break
                case 'send_failed':
                  toast.warning(t('toast.answered_email_failed'))
                  break
                case 'not_applicable':
                  // Reached when admin edits an already-ANSWERED row's
                  // reference (transition wasn't FROM PENDING). Status
                  // saved; no email re-send by design.
                  toast.success(t('toast.answered_with_email'))
                  break
              }
            } else if (target === 'ARCHIVED') {
              toast.success(t('toast.archived'))
            } else {
              toast.success(t('toast.reverted'))
            }
            setActive(null)
            // Refresh the server component so the projected list reflects
            // the new status / timestamps without a full reload.
            router.refresh()
            return
          }
          // Error mapping — distinct messages where useful, generic fallback
          // otherwise. Validation-shape errors are unlikely from the modal
          // (they go through the same zod schema) but logged just in case.
          const errorKey =
            res.error === 'unauthorized' || res.error === 'forbidden'
              ? 'toast.error_forbidden'
              : res.error === 'not_found'
                ? 'toast.error_not_found'
                : res.error === 'validation'
                  ? 'toast.error_validation'
                  : 'toast.error_generic'
          toast.error(t(errorKey))
        } catch (err) {
          console.error('[AdminQuestionsPage runStatusUpdate]', err)
          toast.error(t('toast.error_generic'))
        }
      })
    },
    [router, t],
  )

  const runDelete = useCallback(
    (row: AdminQuestionsRow) => {
      startTransition(async () => {
        try {
          const res = await deleteQuestionAction({ id: row.id })
          if (res.ok) {
            toast.success(t('toast.deleted'))
            setActive(null)
            router.refresh()
            return
          }
          toast.error(t('toast.error_generic'))
        } catch (err) {
          console.error('[AdminQuestionsPage runDelete]', err)
          toast.error(t('toast.error_generic'))
        }
      })
    },
    [router, t],
  )

  /* ── Filter pills ─────────────────────────────────────────────── */

  const filters: ReadonlyArray<FilterValue> = ['all', ...QUESTION_STATUSES]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label={t('filter.aria')}
          className="flex flex-wrap items-center gap-2"
        >
          {filters.map((f) => {
            const isActive = statusFilter === f
            const labelKey =
              f === 'all'
                ? 'filter.status_all'
                : f === 'PENDING'
                  ? 'filter.status_pending'
                  : f === 'ANSWERED'
                    ? 'filter.status_answered'
                    : 'filter.status_archived'
            return (
              <button
                key={f}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleFilter(f)}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-display font-semibold uppercase tracking-[0.06em] transition-colors ${
                  isActive
                    ? 'border-fg1 bg-fg1 text-bg'
                    : 'border-border text-fg3 hover:bg-bg-deep'
                }`}
              >
                {t(labelKey)}
              </button>
            )
          })}
        </div>

        {/* Category dropdown — hidden when no categories have been used yet.
            Vocabulary is free-text on user_questions.category, so the option
            set comes from the data itself (top-N by COUNT) rather than an
            enum. Falls back to "all" silently if the active value drifts
            off the list. */}
        {categoryOptions.length > 0 && (
          <label className="inline-flex items-center gap-2">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-fg3 font-display">
              {t('filter.category_label')}
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => handleCategory(e.target.value)}
              className="rounded-md border border-border bg-bg-elevated px-2 py-1.5 text-[13px] text-fg1"
            >
              <option value="all">{t('filter.category_all')}</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <QuestionsTable
        rows={rows}
        onMarkAnswered={(row) => setActive({ type: 'mark_answered', row })}
        onEditAnswer={(row) => setActive({ type: 'mark_answered', row })}
        onArchive={(row) => setActive({ type: 'archive', row })}
        onRevert={(row) => setActive({ type: 'revert', row })}
        onDelete={(row) => setActive({ type: 'delete', row })}
      />

      {/* Pagination — minimal "page N of M" + prev/next. The admin queue is
          unlikely to grow past a handful of pages, so a full page-number
          selector would be overkill. */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-[12px] text-fg3 font-display">
            {t('pagination.page_of', { current: page, total: totalPages })}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-[12px] font-display font-semibold uppercase tracking-[0.06em] text-fg2 transition-colors hover:bg-bg-deep hover:text-fg1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('pagination.previous')}
            </button>
            <button
              type="button"
              onClick={() => handlePage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-[12px] font-display font-semibold uppercase tracking-[0.06em] text-fg2 transition-colors hover:bg-bg-deep hover:text-fg1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('pagination.next')}
            </button>
          </div>
        </div>
      )}

      {active?.type === 'mark_answered' && (
        <MarkAnsweredModal
          row={active.row}
          locale={locale}
          pending={pending}
          onConfirm={(answerReference) =>
            runStatusUpdate(active.row, 'ANSWERED', answerReference)
          }
          onClose={closeModal}
        />
      )}
      {active?.type === 'archive' && (
        <ArchiveModal
          row={active.row}
          pending={pending}
          onConfirm={() => runStatusUpdate(active.row, 'ARCHIVED', undefined)}
          onClose={closeModal}
        />
      )}
      {active?.type === 'revert' && (
        <RevertModal
          row={active.row}
          pending={pending}
          onConfirm={() => runStatusUpdate(active.row, 'PENDING', undefined)}
          onClose={closeModal}
        />
      )}
      {active?.type === 'delete' && (
        <DeleteModal
          row={active.row}
          pending={pending}
          onConfirm={() => runDelete(active.row)}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
