'use client'

/**
 * Phase C2 — confirms the cascade-delete consequence of removing
 * questions/options from an existing test.
 *
 * The update action returns `confirm_removals_required` with counts when
 * the diff includes any removals. The builder client surfaces this modal
 * with the counts and re-submits with `confirmRemovals: true` on confirm.
 *
 * This is separate from `DeleteTestModal` because it doesn't gate on a
 * confirm-word — the destruction scope is bounded (specific
 * questions/options + their historical answer rows, not the whole test),
 * and the builder form has already been edited live; making the admin
 * type a word at this stage would feel punitive for a routine flow.
 */

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

type Props = {
  removedQuestionCount: number
  removedOptionCount: number
  affectedAttemptCount: number
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}

export function RemovalConfirmModal({
  removedQuestionCount,
  removedOptionCount,
  affectedAttemptCount,
  pending,
  onConfirm,
  onClose,
}: Props) {
  const t = useTranslations('admin.tests.modal.removal_warning')
  const tForms = useTranslations('admin.forms')

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('body', {
              questionCount: removedQuestionCount,
              optionCount: removedOptionCount,
              attemptCount: affectedAttemptCount,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {tForms('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={pending}
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
