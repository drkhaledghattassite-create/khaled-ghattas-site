'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname } from '@/lib/i18n/navigation'
import { showNavLoader } from '@/lib/motion/nav-transition'
import { useSession } from '@/lib/auth/client'
import { AuthRequiredDialog } from '@/components/auth/AuthRequiredDialog'

type Props = {
  bookId: string
  className?: string
  /** True when the current user already owns this book/session. The CTA then
   *  links to the dashboard library instead of opening checkout. */
  owned?: boolean
  children: React.ReactNode
}

export function BookBuyButton({ bookId, className, owned = false, children }: Props) {
  const t = useTranslations('book.checkout')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const { data: session, isPending } = useSession()
  const pathname = usePathname()

  if (owned) {
    return (
      <Link
        href="/dashboard/library"
        aria-label={t('owned_aria_label')}
        className={`${className ?? ''} inline-flex items-center justify-center gap-2`}
      >
        <Check className="h-4 w-4" aria-hidden />
        {t('owned_label')}
      </Link>
    )
  }

  async function startCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bookId, locale }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        url?: string
        error?: { code?: string; message?: string }
      }
      // Server-side guard: if the session expired between gate-check and POST,
      // surface the same prompt instead of dumping the user into an error toast.
      if (res.status === 401) {
        setAuthPromptOpen(true)
        return
      }
      if (res.status === 503) {
        toast.info(t('coming_soon'))
        return
      }
      // SECURITY [H-B2]: the checkout route now returns 404 for
      // unpublished books and 400/VALIDATION for products with no
      // valid price. Both surface the same "not available" copy
      // — leaking the distinction would let probers enumerate
      // DRAFT vs ARCHIVED state of the catalog.
      if (res.status === 404 || res.status === 400) {
        toast.error(json.error?.message ?? t('unavailable'))
        return
      }
      if (!res.ok || !json.url) {
        toast.error(json.error?.message ?? t('error'))
        return
      }
      showNavLoader(1500)
      window.location.href = json.url
    } catch (err) {
      console.error('[BookBuyButton]', err)
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  function handleClick() {
    // Wait until the session has resolved before deciding — otherwise a slow
    // session probe could let an unauthenticated user slip through to the API.
    if (isPending) return
    if (!session?.user) {
      setAuthPromptOpen(true)
      return
    }
    void startCheckout()
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || isPending}
        className={`${className ?? ''} inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
      <AuthRequiredDialog
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        redirectTo={pathname}
      />
    </>
  )
}
