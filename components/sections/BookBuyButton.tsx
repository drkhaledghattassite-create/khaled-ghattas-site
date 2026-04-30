'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { usePathname } from '@/lib/i18n/navigation'
import { showNavLoader } from '@/lib/motion/nav-transition'
import { useSession } from '@/lib/auth/client'
import { AuthRequiredDialog } from '@/components/auth/AuthRequiredDialog'

type Props = {
  bookId: string
  className?: string
  children: React.ReactNode
}

export function BookBuyButton({ bookId, className, children }: Props) {
  const t = useTranslations('book.checkout')
  const [loading, setLoading] = useState(false)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const { data: session, isPending } = useSession()
  const pathname = usePathname()

  async function startCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bookId }),
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
