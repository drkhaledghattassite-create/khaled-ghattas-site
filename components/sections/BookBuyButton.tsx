'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

type Props = {
  bookId: string
  className?: string
  children: React.ReactNode
}

export function BookBuyButton({ bookId, className, children }: Props) {
  const t = useTranslations('book.checkout')
  const [loading, setLoading] = useState(false)

  async function handleClick() {
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
      if (res.status === 503) {
        toast.info(t('coming_soon'))
        return
      }
      if (!res.ok || !json.url) {
        toast.error(json.error?.message ?? t('error'))
        return
      }
      window.location.href = json.url
    } catch (err) {
      console.error('[BookBuyButton]', err)
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`${className ?? ''} inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}
