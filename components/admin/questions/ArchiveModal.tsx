'use client'

/**
 * Phase B2 — archive confirmation.
 *
 * Soft removal (status='ARCHIVED'). The asker still sees the question in
 * their dashboard with the Archived pill; admins can restore later.
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

export function ArchiveModal({ row, pending, onConfirm, onClose }: Props) {
  const t = useTranslations('admin.questions.modal.archive')

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('body', { subject: row.subject })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
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
