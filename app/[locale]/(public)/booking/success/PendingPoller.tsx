'use client'

import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from '@/lib/i18n/navigation'

type Props = {
  sessionId: string
}

const POLL_INTERVAL_MS = 1500
const MAX_POLLS = 7 // ~10s ceiling

/**
 * Tiny client island that polls /api/booking/order-status while the
 * Stripe webhook flips PENDING → PAID. Refreshes the server component
 * (router.refresh) when the order is found PAID; gives up silently
 * after MAX_POLLS so a webhook lag doesn't loop forever.
 *
 * Renders a calm in-place spinner so users see the system is working
 * during the 10s wait. The `motion-reduce:animate-none` lets the
 * reduced-motion preference disable the spin without losing the icon.
 */
export function PendingPoller({ sessionId }: Props) {
  const router = useRouter()
  const polls = useRef(0)
  const t = useTranslations('booking.success')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function poll() {
      if (cancelled || polls.current >= MAX_POLLS) return
      polls.current++
      try {
        const res = await fetch(
          `/api/booking/order-status?session_id=${encodeURIComponent(
            sessionId,
          )}`,
          { cache: 'no-store' },
        )
        if (!res.ok) {
          schedule()
          return
        }
        const json = (await res.json()) as { status?: string }
        if (json.status === 'PAID') {
          if (!cancelled) router.refresh()
          return
        }
        schedule()
      } catch {
        schedule()
      }
    }

    function schedule() {
      if (cancelled || polls.current >= MAX_POLLS) return
      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    schedule()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [sessionId, router])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-6 inline-flex items-center gap-2.5 text-[13px] text-[var(--color-fg3)] ${
        isRtl ? 'font-arabic-body' : 'font-display'
      }`}
    >
      <Loader2
        aria-hidden
        className="h-4 w-4 animate-spin text-[var(--color-accent)] motion-reduce:animate-none"
      />
      <span>{t('confirming')}</span>
    </div>
  )
}
