'use client'

/**
 * Phase B2 — revert confirmation.
 *
 * Used for two transitions:
 *   - ANSWERED → PENDING (clears answerReference + answeredAt)
 *   - ARCHIVED → PENDING (clears archivedAt; "restore")
 *
 * Body copy varies by source state — the modal's parent passes the row, we
 * branch on `row.status`.
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
import type { AdminQuestionsRow } from './AdminQuestionsPage'

type Props = {
  row: AdminQuestionsRow
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}

export function RevertModal({ row, pending, onConfirm, onClose }: Props) {
  const t = useTranslations('admin.questions.modal.revert')

  // ANSWERED → PENDING reads as "Revert"; ARCHIVED → PENDING reads as
  // "Restore". Same action under the hood; different UX framing.
  const fromAnswered = row.status === 'ANSWERED'
  const titleKey = fromAnswered ? 'title_from_answered' : 'title_from_archived'
  const bodyKey = fromAnswered ? 'body_from_answered' : 'body_from_archived'
  const confirmKey = fromAnswered ? 'confirm_revert' : 'confirm_restore'

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t(titleKey)}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(bodyKey, { subject: row.subject })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending && (
              <Loader2 aria-hidden className="me-2 h-3.5 w-3.5 animate-spin" />
            )}
            {t(confirmKey)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
