'use client'

import { useLocale, useTranslations } from 'next-intl'
import { LogIn } from 'lucide-react'
import { useRouter } from '@/lib/i18n/navigation'
import { withRedirect } from '@/lib/auth/redirect'
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
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The path the user should land on after a successful sign-in. */
  redirectTo: string
  /** Optional custom heading; defaults to the generic auth-required message. */
  title?: string
  /** Optional custom body copy. */
  description?: string
}

/**
 * Reusable "you need to sign in" gate. Used by purchase actions and any other
 * surface that requires a session before continuing.
 *
 * Sign In navigates to `/login?redirect=<redirectTo>` so the user is bounced
 * back to the original page after authenticating. Cancel just closes the
 * dialog and leaves them on the current page.
 */
export function AuthRequiredDialog({
  open,
  onOpenChange,
  redirectTo,
  title,
  description,
}: Props) {
  const t = useTranslations('auth.required')
  const locale = useLocale()
  const router = useRouter()
  const isRtl = locale === 'ar'

  function handleSignIn() {
    onOpenChange(false)
    router.push(withRedirect('/login', redirectTo))
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle
            className={isRtl ? 'font-arabic-display' : 'font-arabic-display'}
          >
            {title ?? t('title')}
          </AlertDialogTitle>
          <AlertDialogDescription
            className={isRtl ? 'font-arabic-body' : 'font-display'}
          >
            {description ?? t('description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className={isRtl ? 'font-arabic-body' : 'font-display'}
          >
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSignIn}
            className={`inline-flex items-center gap-2 ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            <LogIn className="h-4 w-4" aria-hidden />
            {t('sign_in')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
