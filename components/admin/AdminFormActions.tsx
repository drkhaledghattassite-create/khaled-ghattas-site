'use client'

/**
 * Shared admin-form action group — submit / cancel / (edit-only) delete.
 *
 * Every admin form (BookForm, ArticleForm, InterviewForm, EventForm,
 * TourForm, BookingForm, CorporateProgramForm, CorporateClientForm) used to
 * inline the same three buttons with slightly drifting class strings. This
 * extracts the pattern so:
 *
 *   - Touch targets are 44px on mobile (min-h-11), 36px on desktop (md:min-h-9)
 *   - Text is 13px on mobile, 12px desktop — readable without zoom
 *   - The delete dialog copy is sourced from the shared admin.actions
 *     namespace once, not 8 times
 *   - Future tweaks land in one place
 *
 * Translation namespaces consumed:
 *   admin.forms.save / .saving / .cancel / .delete
 *   admin.actions.confirm_delete / .no_undo
 */

import { Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type Props = {
  mode: 'create' | 'edit'
  submitting: boolean
  /** Cancel handler — usually `router.push('/admin/<list>')`. */
  onCancel: () => void
  /**
   * Delete handler. Only rendered when `mode === 'edit'` AND this prop is
   * provided. Wrapped in an AlertDialog to confirm. The handler runs after
   * the user confirms — return a Promise if the API call is async so the
   * Alert stays open until it resolves.
   */
  onDelete?: () => Promise<void> | void
}

const buttonBase =
  'inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-[13px] uppercase tracking-[0.08em] font-display font-semibold transition-colors md:min-h-9 md:text-[12px]'

export function AdminFormActions({ mode, submitting, onCancel, onDelete }: Props) {
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')

  return (
    <div className="flex flex-col gap-2 pt-2">
      <button
        type="submit"
        disabled={submitting}
        className={`${buttonBase} border border-fg1 bg-fg1 text-bg hover:bg-accent hover:border-accent hover:text-accent-fg disabled:opacity-60`}
      >
        {submitting ? tForms('saving') : tForms('save')}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className={`${buttonBase} border border-border text-fg1 hover:bg-bg-deep disabled:opacity-60`}
      >
        {tForms('cancel')}
      </button>
      {mode === 'edit' && onDelete ? (
        <AlertDialog>
          <AlertDialogTrigger
            className={`${buttonBase} gap-1.5 border border-accent/60 text-accent hover:bg-accent hover:text-accent-fg`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {tForms('delete')}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{tActions('confirm_delete')}</AlertDialogTitle>
              <AlertDialogDescription>{tActions('no_undo')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tForms('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => void onDelete()}>
                {tForms('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  )
}
