'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check, Copy, ExternalLink, Loader2, Mail } from 'lucide-react'
import { Link, useRouter } from '@/lib/i18n/navigation'
import { EASE_EDITORIAL, EASE_REVEAL, fadeUp } from '@/lib/motion/variants'
import { resendGiftEmailAction } from '@/app/[locale]/(public)/gifts/actions'

type Status = 'READY' | 'PENDING' | 'NOT_FOUND'

// Phase H R-4 — the success route returns the pre-built `claimUrl`
// rather than the raw token. The sender never needs the token in
// isolation; sharing the URL is the only legitimate use. Server-side
// construction keeps the token off the wire in this response.
type StatusResponse =
  | {
      status: 'READY'
      giftId: string
      claimUrl: string
      recipientEmail: string
      expiresAt: string
      giftStatus: 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'REVOKED' | 'REFUNDED'
    }
  | { status: 'PENDING' }
  | { status: 'NOT_FOUND' }

type Props = {
  sessionId: string | null
  locale: 'ar' | 'en'
  origin: string
}

const POLL_INTERVAL_MS = 1500
const MAX_POLLS = 12

/**
 * Self-contained "gift on its way" surface. Polls /api/gifts/status until
 * the webhook creates the gift row, then reveals the recipient email +
 * shareable claim link with a copy-to-clipboard fallback.
 *
 * Why this exists: Stripe's success_url fires immediately on payment, but
 * the webhook that creates the gift row can lag by 1-10s. Without this
 * poller, the sender lands on a static success page with no information.
 *
 * The shareable-link fallback is the recipient's lifeline when the
 * transactional email fails (Resend not configured, EMAIL_FROM domain
 * unverified, recipient's mailbox bounces). The sender can copy + paste
 * into WhatsApp/iMessage. Token + email-match still gate the claim, so
 * the URL is safe to share once.
 */
export function GiftSuccessIsland({ sessionId, locale, origin }: Props) {
  const t = useTranslations('gifts.success')
  const localeCtx = useLocale()
  const isRtl = localeCtx === 'ar'
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const polls = useRef(0)
  const [status, setStatus] = useState<Status>(sessionId ? 'PENDING' : 'NOT_FOUND')
  const [data, setData] = useState<Extract<StatusResponse, { status: 'READY' }> | null>(null)
  const [copied, setCopied] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function poll() {
      if (cancelled) return
      polls.current++
      try {
        // Pass `locale` so the route returns a locale-prefixed claimUrl
        // matching the sender's current view. The route defaults to 'ar'
        // when this param is missing — same behavior in either case.
        const res = await fetch(
          `/api/gifts/status?session_id=${encodeURIComponent(sessionId!)}&locale=${encodeURIComponent(locale)}`,
          { cache: 'no-store' },
        )
        if (res.ok) {
          const json = (await res.json()) as StatusResponse
          if (json.status === 'READY') {
            if (!cancelled) {
              setData(json)
              setStatus('READY')
            }
            return
          }
          if (json.status === 'NOT_FOUND') {
            if (!cancelled && polls.current >= MAX_POLLS) {
              setStatus('NOT_FOUND')
            }
          }
        }
      } catch {
        /* swallow — retry */
      }
      if (cancelled) return
      if (polls.current >= MAX_POLLS) {
        setStatus('NOT_FOUND')
        return
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }
    timer = setTimeout(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [sessionId, locale])

  // claimUrl is now provided by the route (Phase H R-4) — the raw
  // token never crosses the wire in this response. `origin` is kept
  // as a prop for backwards-compatibility with the parent route, but
  // is unused once the response carries the assembled URL.
  void origin
  const claimUrl = data?.claimUrl ?? null

  const handleCopy = useCallback(async () => {
    if (!claimUrl) return
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(claimUrl)
        setCopied(true)
        toast.success(t('copied'))
        setTimeout(() => setCopied(false), 2400)
      } else {
        toast.error(t('copy_failed'))
      }
    } catch {
      toast.error(t('copy_failed'))
    }
  }, [claimUrl, t])

  const handleResend = useCallback(async () => {
    if (!data) return
    setResending(true)
    try {
      const result = await resendGiftEmailAction({ giftId: data.giftId })
      if (result.ok) {
        toast.success(t('resend_success'))
      } else if (result.error === 'rate_limited') {
        toast.error(t('resend_rate_limited'))
      } else {
        toast.error(t('resend_failed'))
      }
    } finally {
      setResending(false)
    }
  }, [data, t])

  // Auto-refresh the surrounding shell once we know the gift exists so
  // server-side caches (e.g., dashboard) pick up the new row on next nav.
  useEffect(() => {
    if (status === 'READY') router.refresh()
  }, [status, router])

  const fmtDate = (iso: string): string => {
    try {
      return new Intl.DateTimeFormat(isRtl ? 'ar-LB' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(iso))
    } catch {
      return iso.slice(0, 10)
    }
  }

  return (
    <motion.div
      dir={isRtl ? 'rtl' : 'ltr'}
      variants={reduceMotion ? undefined : fadeUp}
      initial={reduceMotion ? false : 'hidden'}
      animate={reduceMotion ? undefined : 'visible'}
      transition={{ duration: 0.7, ease: EASE_EDITORIAL }}
      className="mx-auto max-w-[640px] [padding:clamp(72px,10vw,128px)_clamp(20px,5vw,56px)]"
    >
      {/* Envelope motif — the slow seal-reveal sets the editorial tone */}
      <div className="mb-10 flex justify-center">
        <EnvelopeSeal status={status} />
      </div>

      <span
        className={`block text-center section-eyebrow ${
          isRtl ? 'eyebrow-invitation' : 'eyebrow-accent'
        }`}
      >
        {t('eyebrow')}
      </span>

      <h1
        className={`mt-3 m-0 text-center text-[clamp(28px,4vw,44px)] leading-[1.15] font-bold tracking-[-0.012em] text-[var(--color-fg1)] [text-wrap:balance] ${
          isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.022em]'
        }`}
      >
        {status === 'READY' ? t('heading_paid') : t('heading_pending')}
      </h1>

      {status === 'READY' && data && (
        <>
          <p
            className={`mt-4 m-0 text-center text-[16px] leading-[1.65] text-[var(--color-fg2)] [text-wrap:pretty] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('body_paid', { email: data.recipientEmail })}
          </p>

          <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6">
            <p
              className={`m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body !tracking-normal !normal-case !text-[12px] !font-bold' : 'font-display'
              }`}
            >
              {t('recipient_label')}
            </p>
            <p
              className={`mt-1 m-0 text-[16px] font-semibold text-[var(--color-fg1)] break-all ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {data.recipientEmail}
            </p>

            <div className="mt-6 h-px bg-[var(--color-border)]" />

            <p
              className={`mt-6 m-0 text-[14px] font-semibold text-[var(--color-fg1)] ${
                isRtl ? 'font-arabic-display' : 'font-display'
              }`}
            >
              {t('share_heading')}
            </p>
            <p
              className={`mt-2 m-0 text-[13px] leading-[1.55] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {t('share_body')}
            </p>

            <div className="mt-4 flex items-stretch gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] p-1">
              <code
                className="flex-1 truncate px-3 py-2 text-[12px] font-mono text-[var(--color-fg2)]"
                dir="ltr"
              >
                {claimUrl}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={t('copy_link')}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-fg1)] px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent)]"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                )}
                <span className={isRtl ? 'font-arabic-body' : 'font-display'}>
                  {copied ? t('copied') : t('copy_link')}
                </span>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className={`inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-transparent px-4 py-2 text-[13px] font-semibold text-[var(--color-fg2)] transition-colors hover:bg-[var(--color-bg-deep)] hover:text-[var(--color-fg1)] disabled:opacity-50 ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                <Mail className="h-3.5 w-3.5" aria-hidden />
                {resending ? t('resend_sending') : t('resend_email')}
              </button>
              {claimUrl && (
                <a
                  href={claimUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-transparent px-4 py-2 text-[13px] font-semibold text-[var(--color-fg2)] transition-colors hover:bg-[var(--color-bg-deep)] hover:text-[var(--color-fg1)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  {t('open_link')}
                </a>
              )}
            </div>

            <p
              className={`mt-5 m-0 text-[12px] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {t('expires_at', { date: fmtDate(data.expiresAt) })}
            </p>
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_REVEAL, delay: 0.18 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link href="/dashboard/gifts" className="btn-pill btn-pill-primary">
              {t('go_dashboard')}
            </Link>
            <Link href="/gifts/send" className="btn-pill btn-pill-secondary">
              {t('send_another')}
            </Link>
          </motion.div>
        </>
      )}

      {status === 'PENDING' && (
        <>
          <p
            className={`mt-4 m-0 text-center text-[16px] leading-[1.65] text-[var(--color-fg2)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('body_pending')}
          </p>
          <div className="mt-8 flex items-center justify-center gap-2.5 text-[13px] text-[var(--color-fg3)]">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)] motion-reduce:animate-none" aria-hidden />
            <span className={isRtl ? 'font-arabic-body' : 'font-display'}>
              {t('confirming')}
            </span>
          </div>
        </>
      )}

      {status === 'NOT_FOUND' && (
        <>
          <p
            className={`mt-4 m-0 text-center text-[16px] leading-[1.65] text-[var(--color-fg2)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('not_found_body')}
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/dashboard/gifts" className="btn-pill btn-pill-primary">
              {t('go_dashboard')}
            </Link>
          </div>
        </>
      )}
    </motion.div>
  )
}

/**
 * Slow seal reveal — the envelope flap lifts on mount, the wax stamp
 * fades in. Once the gift is READY (recipient revealed) we swap the wax
 * stamp for the accent check mark. Reduced-motion hides the animation
 * but keeps the icon visible.
 */
function EnvelopeSeal({ status }: { status: Status }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className="relative h-[88px] w-[120px]">
      {/* Envelope body */}
      <motion.svg
        viewBox="0 0 120 88"
        aria-hidden
        className="absolute inset-0 h-full w-full"
        initial={reduceMotion ? false : { y: 12, opacity: 0 }}
        animate={reduceMotion ? undefined : { y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE_REVEAL }}
      >
        <rect
          x="2"
          y="20"
          width="116"
          height="64"
          rx="6"
          fill="var(--color-bg-elevated)"
          stroke="var(--color-border-strong)"
          strokeWidth="1.25"
        />
        <path
          d="M2 26 L60 60 L118 26"
          fill="none"
          stroke="var(--color-border-strong)"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </motion.svg>
      {/* Flap — lifts up on load to feel like an opening envelope */}
      <motion.svg
        viewBox="0 0 120 88"
        aria-hidden
        className="absolute inset-0 h-full w-full"
        initial={reduceMotion ? false : { rotateX: 0 }}
        animate={
          reduceMotion ? undefined : { rotateX: status === 'READY' ? 180 : 0 }
        }
        transition={{ duration: 0.9, ease: EASE_EDITORIAL, delay: 0.2 }}
        style={{ transformOrigin: 'center 26px', transformStyle: 'preserve-3d' }}
      >
        <path
          d="M2 26 L60 60 L118 26 L118 22 L60 4 L2 22 Z"
          fill="var(--color-bg)"
          stroke="var(--color-border-strong)"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </motion.svg>
      {/* Wax seal / check stamp */}
      <motion.div
        aria-hidden
        initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
        animate={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
        transition={{
          duration: 0.5,
          ease: EASE_EDITORIAL,
          delay: status === 'READY' ? 0.9 : 0.45,
        }}
        className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-[0_8px_22px_-12px_rgba(184,84,64,0.55)]"
      >
        {status === 'READY' ? (
          <Check className="h-5 w-5" aria-hidden />
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path
              d="M12 3v18M3 12h18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </motion.div>
    </div>
  )
}
