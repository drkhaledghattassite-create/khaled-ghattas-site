'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { GiftItemType, GiftSource, GiftStatus } from '@/lib/db/schema'
import {
  resendAdminGiftEmailAction,
  revokeGiftAction,
} from '@/app/[locale]/(admin)/admin/gifts/actions'
import { useRouter } from '@/lib/i18n/navigation'

export type AdminGiftDetail = {
  id: string
  token: string
  source: GiftSource
  status: GiftStatus
  itemType: GiftItemType
  itemId: string
  recipientEmail: string
  senderUserId: string | null
  recipientUserId: string | null
  adminGrantedByUserId: string | null
  senderMessage: string | null
  amountCents: number | null
  currency: string
  stripeSessionId: string | null
  stripePaymentIntentId: string | null
  locale: string
  createdAt: string
  expiresAt: string
  claimedAt: string | null
  revokedAt: string | null
  revokedReason: string | null
  refundedAt: string | null
  emailSentAt: string | null
  emailSendFailedReason: string | null
}

function fmtAmount(cents: number | null, currency: string, locale: string): string {
  if (cents == null) return '—'
  const major = (cents / 100).toFixed(2)
  return locale === 'ar' ? `${major} ${currency.toUpperCase()}` : `${currency.toUpperCase()} ${major}`
}

function fmtDateTime(iso: string | null, locale: string): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function AdminGiftDetailPage({
  locale,
  gift,
  senderName,
  senderEmail,
  recipientName,
  adminName,
  adminEmail,
  itemTitleAr,
  itemTitleEn,
}: {
  locale: 'ar' | 'en'
  gift: AdminGiftDetail
  senderName: string | null
  senderEmail: string | null
  recipientName: string | null
  adminName: string | null
  adminEmail: string | null
  itemTitleAr: string | null
  itemTitleEn: string | null
}) {
  const t = useTranslations('admin.gifts.detail')
  const tRev = useTranslations('admin.gifts.revoke_modal')
  const tStatus = useTranslations('dashboard.gifts.row')
  const localeCtx = useLocale()
  const isRtl = localeCtx === 'ar'
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [revokeReason, setRevokeReason] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const isTerminal =
    gift.status === 'REVOKED' || gift.status === 'REFUNDED' || gift.status === 'EXPIRED'

  function handleRevoke() {
    setErrorKey(null)
    startTransition(async () => {
      const result = await revokeGiftAction({
        giftId: gift.id,
        reason: revokeReason.trim(),
      })
      if (!result.ok) {
        setErrorKey(result.error)
        return
      }
      setRevokeOpen(false)
      router.refresh()
    })
  }

  function handleResend() {
    setFeedback(null)
    setErrorKey(null)
    startTransition(async () => {
      const result = await resendAdminGiftEmailAction({ giftId: gift.id })
      if (result.ok) setFeedback(tStatus('resend_success'))
      else if (result.error === 'rate_limited')
        setFeedback(tStatus('resend_rate_limited'))
      else setFeedback(tStatus('resend_failed'))
    })
  }

  const itemTitle = isRtl ? itemTitleAr : itemTitleEn

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="grid gap-6">
      <header>
        <h1
          className={`m-0 text-[clamp(20px,2.4vw,26px)] font-bold text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-display' : 'font-display'
          }`}
        >
          {t('heading')}
        </h1>
      </header>

      <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <h2
          className={`m-0 mb-4 text-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--color-fg3)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('section_overview')}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[14px]">
          <DetailRow label={t('label_status')} value={tStatus(`status_${gift.status.toLowerCase()}` as never)} />
          <DetailRow
            label={t('label_source')}
            value={gift.source === 'ADMIN_GRANT' ? t('section_overview') : ''}
          />
          <DetailRow label={t('label_item')} value={itemTitle ?? '—'} />
          <DetailRow
            label={t('label_item_type')}
            value={
              gift.itemType === 'BOOK'
                ? tStatus('type_book')
                : gift.itemType === 'SESSION'
                  ? tStatus('type_session')
                  : gift.itemType === 'BOOKING'
                    ? tStatus('type_booking')
                    : 'TEST'
            }
          />
          <DetailRow
            label={t('label_recipient')}
            value={`${recipientName ? `${recipientName} · ` : ''}${gift.recipientEmail}`}
          />
          {senderEmail && (
            <DetailRow
              label={t('label_sender')}
              value={`${senderName ? `${senderName} · ` : ''}${senderEmail}`}
            />
          )}
          {adminEmail && (
            <DetailRow
              label={t('label_admin_granted_by')}
              value={`${adminName ? `${adminName} · ` : ''}${adminEmail}`}
            />
          )}
          <DetailRow
            label={t('label_amount')}
            value={fmtAmount(gift.amountCents, gift.currency, locale)}
          />
          <DetailRow label={t('label_locale')} value={gift.locale.toUpperCase()} />
          <DetailRow label={t('label_token')} value={gift.token} mono />
          {gift.stripeSessionId && (
            <DetailRow label="Stripe Session" value={gift.stripeSessionId} mono />
          )}
          {gift.senderMessage && (
            <DetailRow label="Note" value={gift.senderMessage} fullWidth />
          )}
        </dl>
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <h2
          className={`m-0 mb-4 text-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--color-fg3)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('section_timeline')}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[14px]">
          <DetailRow label={t('label_created')} value={fmtDateTime(gift.createdAt, locale)} />
          <DetailRow label={t('label_expires')} value={fmtDateTime(gift.expiresAt, locale)} />
          {gift.claimedAt && (
            <DetailRow label={t('label_claimed')} value={fmtDateTime(gift.claimedAt, locale)} />
          )}
          {gift.revokedAt && (
            <DetailRow label={t('label_revoked')} value={fmtDateTime(gift.revokedAt, locale)} />
          )}
          {gift.revokedReason && (
            <DetailRow label={t('label_revoked_reason')} value={gift.revokedReason} fullWidth />
          )}
          {gift.refundedAt && (
            <DetailRow label={t('label_refunded')} value={fmtDateTime(gift.refundedAt, locale)} />
          )}
        </dl>
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <h2
          className={`m-0 mb-4 text-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--color-fg3)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('section_email')}
        </h2>
        {gift.emailSentAt ? (
          <p className="m-0 text-[14px] text-[var(--color-fg2)]">
            {t('label_email_sent')}: {fmtDateTime(gift.emailSentAt, locale)}
          </p>
        ) : gift.emailSendFailedReason ? (
          <p className="m-0 text-[14px] text-[var(--color-destructive)]">
            {t('label_email_failed')}: {gift.emailSendFailedReason}
          </p>
        ) : (
          <p className="m-0 text-[14px] text-[var(--color-fg3)]">
            {t('no_email_yet')}
          </p>
        )}
      </section>

      {feedback && (
        <p className="m-0 text-[13px] text-[var(--color-fg2)]">{feedback}</p>
      )}

      <div className="flex flex-wrap gap-3">
        {!isTerminal && (
          <button
            type="button"
            onClick={() => setRevokeOpen(true)}
            className="btn-pill btn-pill-secondary"
          >
            {t('revoke_cta')}
          </button>
        )}
        {gift.status === 'PENDING' && (
          <button
            type="button"
            onClick={handleResend}
            disabled={isPending}
            className="btn-pill btn-pill-primary disabled:opacity-50"
          >
            {t('resend_cta')}
          </button>
        )}
      </div>

      {revokeOpen && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-destructive)]/40 bg-[var(--color-bg-elevated)] p-5">
          <h3
            className={`m-0 text-[16px] font-bold text-[var(--color-fg1)] ${
              isRtl ? 'font-arabic-display' : 'font-display'
            }`}
          >
            {tRev('title')}
          </h3>
          <p
            className={`mt-2 m-0 text-[13px] text-[var(--color-fg2)] leading-[1.55] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {gift.status === 'CLAIMED' ? tRev('body_claimed') : tRev('body_pending')}
          </p>
          {gift.source === 'USER_PURCHASE' && (
            <p
              className={`mt-2 m-0 text-[13px] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {tRev('stripe_note')}
            </p>
          )}
          <label className="mt-4 grid gap-1.5">
            <span className="text-[13px] font-semibold text-[var(--color-fg2)]">
              {tRev('reason_label')}
            </span>
            <textarea
              rows={3}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder={tRev('reason_placeholder')}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[14px]"
            />
          </label>
          {errorKey && (
            <p className="mt-3 m-0 text-[13px] text-[var(--color-destructive)]">
              {tRev(`errors.${errorKey === 'validation' ? 'validation' : errorKey === 'wrong_state' ? 'wrong_state' : errorKey === 'not_found' ? 'not_found' : 'unknown'}` as never)}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRevoke}
              disabled={isPending}
              className="btn-pill btn-pill-secondary disabled:opacity-50"
            >
              {isPending ? tRev('submit_loading') : tRev('submit_cta')}
            </button>
            <button
              type="button"
              onClick={() => setRevokeOpen(false)}
              className="btn-pill btn-pill-primary"
            >
              {tRev('cancel_cta')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
  fullWidth,
}: {
  label: string
  value: string
  mono?: boolean
  fullWidth?: boolean
}) {
  return (
    <div className={fullWidth ? 'sm:col-span-2 grid gap-1' : 'grid gap-1'}>
      <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-fg3)]">
        {label}
      </dt>
      <dd
        className={`m-0 text-[var(--color-fg1)] break-words ${
          mono ? 'font-mono text-[12px]' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
