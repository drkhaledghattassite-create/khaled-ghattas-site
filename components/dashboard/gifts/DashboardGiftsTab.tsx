'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Link } from '@/lib/i18n/navigation'
import {
  resendGiftEmailAction,
  cancelGiftAction,
} from '@/app/[locale]/(public)/gifts/actions'
import type { ClientGift } from '@/app/[locale]/(dashboard)/dashboard/gifts/page'
import { EASE_EDITORIAL, fadeUp } from '@/lib/motion/variants'

function fmtAmount(cents: number | null, currency: string, locale: string): string {
  if (cents == null) return '—'
  const major = (cents / 100).toFixed(2)
  const cur = currency.toUpperCase()
  return locale === 'ar' ? `${major} ${cur}` : `${cur} ${major}`
}

function fmtDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

function StatusPill({
  status,
  locale,
}: {
  status: ClientGift['status']
  locale: string
}) {
  const t = useTranslations('dashboard.gifts.row')
  const isRtl = locale === 'ar'
  const map: Record<ClientGift['status'], { label: string; cls: string }> = {
    PENDING: {
      label: t('status_pending'),
      cls: 'bg-[var(--color-accent-soft)] text-[var(--color-accent-hover)]',
    },
    CLAIMED: {
      label: t('status_claimed'),
      cls: 'bg-[var(--color-bg-deep)] text-[var(--color-fg1)]',
    },
    EXPIRED: {
      label: t('status_expired'),
      cls: 'bg-[var(--color-bg-deep)] text-[var(--color-fg3)]',
    },
    REVOKED: {
      label: t('status_revoked'),
      cls: 'bg-[var(--color-bg-deep)] text-[var(--color-fg3)]',
    },
    REFUNDED: {
      label: t('status_refunded'),
      cls: 'bg-[var(--color-bg-deep)] text-[var(--color-fg3)]',
    },
  }
  const m = map[status]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-[var(--radius-pill)] text-[12px] font-semibold ${m.cls} ${
        isRtl ? 'font-arabic-body' : 'font-display'
      }`}
    >
      {m.label}
    </span>
  )
}

function GiftRow({
  gift,
  audience,
}: {
  gift: ClientGift
  audience: 'sent' | 'received'
}) {
  const t = useTranslations('dashboard.gifts.row')
  const localeCtx = useLocale()
  const isRtl = localeCtx === 'ar'
  const [isPending, startTransition] = useTransition()
  const [cancelOpen, setCancelOpen] = useState(false)

  function handleResend() {
    startTransition(async () => {
      const result = await resendGiftEmailAction({ giftId: gift.id })
      if (result.ok) toast.success(t('resend_success'))
      else if (result.error === 'rate_limited') toast.error(t('resend_rate_limited'))
      else toast.error(t('resend_failed'))
    })
  }

  function handleCancel() {
    // For USER_PURCHASE this returns 'contact_support' — we surface the
    // inline dialog as the UI affordance. The action call itself is kept
    // available for forward-compat admin-driven cancellations.
    void cancelGiftAction
    setCancelOpen(true)
  }

  const itemTypeKey =
    gift.itemType === 'BOOK'
      ? 'type_book'
      : gift.itemType === 'SESSION'
        ? 'type_session'
        : 'type_booking'

  const otherParty =
    audience === 'sent'
      ? gift.recipientEmail
      : gift.source === 'ADMIN_GRANT'
        ? t('from_admin_grant')
        : gift.senderEmail ?? t('from_unknown')

  return (
    <li className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusPill status={gift.status} locale={localeCtx} />
            <span
              className={`text-[12px] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {t(itemTypeKey)}
            </span>
          </div>
          <p
            className={`mt-2 m-0 text-[14px] text-[var(--color-fg2)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {audience === 'sent' ? t('to') : t('from')}: {otherParty}
          </p>
          <p
            className={`mt-1 m-0 text-[12px] text-[var(--color-fg3)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {fmtDate(gift.createdAt, localeCtx)}
          </p>
        </div>
        {audience === 'sent' && (
          <div
            className={`text-[14px] font-semibold text-[var(--color-fg1)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {fmtAmount(gift.amountCents, gift.currency, localeCtx)}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {audience === 'sent' && gift.status === 'PENDING' && (
          <>
            <button
              type="button"
              onClick={handleResend}
              disabled={isPending}
              className="px-3 py-1.5 rounded-[var(--radius-pill)] border border-[var(--color-border)] text-[13px] text-[var(--color-fg2)] hover:border-[var(--color-border-strong)] disabled:opacity-50"
            >
              {t('resend_cta')}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-[var(--radius-pill)] border border-[var(--color-border)] text-[13px] text-[var(--color-fg2)] hover:border-[var(--color-border-strong)]"
            >
              {t('cancel_cta')}
            </button>
          </>
        )}
        {audience === 'received' && gift.status === 'CLAIMED' && (
          <Link
            href={
              gift.itemType === 'BOOKING'
                ? '/dashboard/bookings'
                : '/dashboard/library'
            }
            className="px-3 py-1.5 rounded-[var(--radius-pill)] bg-[var(--color-fg1)] text-[var(--color-bg)] text-[13px] font-semibold"
          >
            {t('open_cta')}
          </Link>
        )}
      </div>
      {cancelOpen && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
          <p
            className={`m-0 text-[14px] font-bold text-[var(--color-fg1)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('cancel_dialog_title')}
          </p>
          <p
            className={`mt-2 m-0 text-[13px] text-[var(--color-fg2)] leading-[1.55] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('cancel_dialog_body')}
          </p>
          <button
            type="button"
            onClick={() => setCancelOpen(false)}
            className="mt-3 px-3 py-1.5 rounded-[var(--radius-pill)] border border-[var(--color-border)] text-[13px] text-[var(--color-fg2)]"
          >
            {t('cancel_dialog_close')}
          </button>
        </div>
      )}
    </li>
  )
}

export function DashboardGiftsTab({
  sent,
  received,
  canSendGift,
}: {
  sent: ClientGift[]
  received: ClientGift[]
  canSendGift: boolean
}) {
  const t = useTranslations('dashboard.gifts')
  const localeCtx = useLocale()
  const isRtl = localeCtx === 'ar'
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className={`m-0 text-[clamp(22px,2.6vw,30px)] leading-[1.2] font-bold text-[var(--color-fg1)] ${
              isRtl ? 'font-arabic-display' : 'font-display'
            }`}
          >
            {t('heading')}
          </h1>
          <p
            className={`mt-2 m-0 text-[15px] text-[var(--color-fg2)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('subheading')}
          </p>
        </div>
        {canSendGift && (
          <Link href="/gifts/send" className="btn-pill btn-pill-accent">
            {t('send_cta')}
          </Link>
        )}
      </header>

      <section className="mb-10">
        <h2
          className={`m-0 mb-3 text-[16px] font-bold text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-display' : 'font-display'
          }`}
        >
          {t('section_sent')}
        </h2>
        {sent.length === 0 ? (
          <p
            className={`m-0 text-[14px] text-[var(--color-fg3)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('empty_sent')}
          </p>
        ) : (
          <ul className="m-0 p-0 list-none grid gap-3">
            {sent.map((g) => (
              <GiftRow key={g.id} gift={g} audience="sent" />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2
          className={`m-0 mb-3 text-[16px] font-bold text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-display' : 'font-display'
          }`}
        >
          {t('section_received')}
        </h2>
        {received.length === 0 ? (
          <p
            className={`m-0 text-[14px] text-[var(--color-fg3)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('empty_received')}
          </p>
        ) : (
          <ul className="m-0 p-0 list-none grid gap-3">
            {received.map((g) => (
              <GiftRow key={g.id} gift={g} audience="received" />
            ))}
          </ul>
        )}
      </section>
    </motion.div>
  )
}
