'use client'

/**
 * Phase C2 — confirm publish/unpublish.
 *
 * Two copies: publish highlights "this will appear in the public catalog"
 * (the consequence admins are most likely to underweight); unpublish
 * highlights "existing attempts are NOT deleted" (the worry admins are
 * most likely to overweight).
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
import type { AdminTestRow } from './AdminTestsListPage'

type Props = {
  row: AdminTestRow
  next: boolean
  locale: 'ar' | 'en'
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}

export function PublishTestModal({
  row,
  next,
  locale,
  pending,
  onConfirm,
  onClose,
}: Props) {
  const t = useTranslations('admin.tests.modal.publish')
  const tForms = useTranslations('admin.forms')
  const title = locale === 'ar' ? row.titleAr : row.titleEn

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {next ? t('title_publish') : t('title_unpublish')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {next
              ? t('body_publish', { title })
              : t('body_unpublish', { title })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {tForms('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending && (
              <Loader2
                aria-hidden
                className="me-2 h-3.5 w-3.5 animate-spin"
              />
            )}
            {next ? t('confirm_publish') : t('confirm_unpublish')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
