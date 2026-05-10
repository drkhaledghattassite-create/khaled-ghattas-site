'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link, useRouter } from '@/lib/i18n/navigation'
import type { Gift } from '@/lib/db/schema'
import type { GiftableItemType } from '@/lib/validators/gift'
import { EASE_EDITORIAL, fadeUp } from '@/lib/motion/variants'
import { claimGiftAction } from '@/app/[locale]/(public)/gifts/actions'
import { authClient } from '@/lib/auth/client'

type ItemDisplay = {
  titleAr: string
  titleEn: string
  coverImage: string | null
  itemType: GiftableItemType
}

type SessionUser = {
  id: string
  email: string
  emailVerified: boolean
}

function fmtDate(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

function redactEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${'*'.repeat(Math.max(2, local.length - visible.length))}@${domain}`
}

export function GiftClaimPage({
  locale,
  token,
  gift,
  itemDisplay,
  senderDisplayName,
  sessionUser,
}: {
  locale: string
  token: string
  gift: Gift | null
  itemDisplay: ItemDisplay | null
  senderDisplayName: string | null
  sessionUser: SessionUser | null
}) {
  const t = useTranslations('gifts.claim')
  const localeCtx = useLocale()
  const isRtl = localeCtx === 'ar'
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorKey, setErrorKey] = useState<string | null>(null)

  // State derivation
  const expired = !!gift && gift.expiresAt.getTime() <= Date.now()
  const valid = !!gift && gift.status === 'PENDING' && !expired
  const sessionEmailLc = sessionUser?.email?.trim().toLowerCase() ?? null
  const giftEmailLc = gift?.recipientEmail?.toLowerCase() ?? null
  const emailMatch = sessionEmailLc != null && giftEmailLc != null && sessionEmailLc === giftEmailLc

  let renderState:
    | 'invalid'
    | 'logged_out'
    | 'mismatch'
    | 'verifying'
    | 'ready' = 'invalid'
  if (!valid) renderState = 'invalid'
  else if (!sessionUser) renderState = 'logged_out'
  else if (!emailMatch) renderState = 'mismatch'
  else if (!sessionUser.emailVerified) renderState = 'verifying'
  else renderState = 'ready'

  const itemTitle =
    itemDisplay && (isRtl ? itemDisplay.titleAr : itemDisplay.titleEn)
  const fromName =
    senderDisplayName ??
    (gift?.source === 'ADMIN_GRANT' ? t('from_admin') : null)

  function handleClaim() {
    setErrorKey(null)
    startTransition(async () => {
      const result = await claimGiftAction({ token })
      if (!result.ok) {
        setErrorKey(result.error)
        return
      }
      router.push(result.redirectPath)
    })
  }

  async function handleSignOut() {
    await authClient.signOut()
    router.refresh()
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-dvh bg-[var(--color-bg)] flex items-center justify-center"
    >
      <div className="mx-auto max-w-[560px] w-full px-[var(--section-pad-x)] py-[var(--section-pad-y)]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
          className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8"
        >
          <span
            className={`section-eyebrow ${isRtl ? 'eyebrow-invitation' : 'eyebrow-accent'}`}
          >
            {t('eyebrow')}
          </span>

          {renderState === 'invalid' && (
            <>
              <h1
                className={`mt-3 m-0 text-[24px] font-bold leading-[1.25] text-[var(--color-fg1)] ${
                  isRtl ? 'font-arabic-display' : 'font-display'
                }`}
              >
                {t('invalid_heading')}
              </h1>
              <p
                className={`mt-3 m-0 text-[15px] leading-[1.55] text-[var(--color-fg2)] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('invalid_body')}
              </p>
              <div className="mt-6">
                <Link href="/" className="btn-pill btn-pill-primary">
                  {t('invalid_browse_cta')}
                </Link>
              </div>
            </>
          )}

          {renderState === 'logged_out' && itemDisplay && gift && (
            <>
              <h1
                className={`mt-3 m-0 text-[24px] font-bold leading-[1.25] text-[var(--color-fg1)] ${
                  isRtl ? 'font-arabic-display' : 'font-display'
                }`}
              >
                {t('logged_out_heading')}
              </h1>
              <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                {itemDisplay.coverImage && (
                  <div
                    className="mx-auto mb-3 aspect-[3/4] w-[120px] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-bg-deep)]"
                    aria-hidden="true"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={itemDisplay.coverImage}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <p
                  className={`m-0 text-[16px] font-bold text-[var(--color-fg1)] line-clamp-2 ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {itemTitle}
                </p>
                {fromName && (
                  <p
                    className={`mt-1 m-0 text-[13px] text-[var(--color-fg3)] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {t('from_label')}: {fromName}
                  </p>
                )}
                {gift.senderMessage && (
                  <p
                    className={`mt-3 m-0 text-[14px] italic text-[var(--color-fg2)] leading-[1.55] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    “{gift.senderMessage}”
                  </p>
                )}
              </div>
              <p
                className={`mt-4 m-0 text-[14px] text-[var(--color-fg3)] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('email_hint', { email: redactEmail(gift.recipientEmail) })}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/${locale}/gifts/claim?token=${token}`)}`}
                  className="btn-pill btn-pill-accent"
                >
                  {t('logged_out_signin_cta')}
                </Link>
                <Link
                  href={`/register?redirect=${encodeURIComponent(`/${locale}/gifts/claim?token=${token}`)}&email=${encodeURIComponent(gift.recipientEmail)}`}
                  className="btn-pill btn-pill-secondary"
                >
                  {t('logged_out_register_cta')}
                </Link>
              </div>
              <p
                className={`mt-4 m-0 text-[12px] text-[var(--color-fg3)] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('expires_at', { date: fmtDate(gift.expiresAt, locale) })}
              </p>
            </>
          )}

          {renderState === 'mismatch' && (
            <>
              <h1
                className={`mt-3 m-0 text-[24px] font-bold leading-[1.25] text-[var(--color-fg1)] ${
                  isRtl ? 'font-arabic-display' : 'font-display'
                }`}
              >
                {t('mismatch_heading')}
              </h1>
              <p
                className={`mt-3 m-0 text-[15px] leading-[1.55] text-[var(--color-fg2)] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('mismatch_body')}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="btn-pill btn-pill-primary"
                >
                  {t('mismatch_signout_cta')}
                </button>
              </div>
            </>
          )}

          {renderState === 'verifying' && (
            <>
              <h1
                className={`mt-3 m-0 text-[24px] font-bold leading-[1.25] text-[var(--color-fg1)] ${
                  isRtl ? 'font-arabic-display' : 'font-display'
                }`}
              >
                {t('verifying_heading')}
              </h1>
              <p
                className={`mt-3 m-0 text-[15px] leading-[1.55] text-[var(--color-fg2)] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('verifying_body')}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="btn-pill btn-pill-primary"
                >
                  {t('verifying_refresh_cta')}
                </button>
              </div>
            </>
          )}

          {renderState === 'ready' && itemDisplay && gift && (
            <>
              <h1
                className={`mt-3 m-0 text-[24px] font-bold leading-[1.25] text-[var(--color-fg1)] ${
                  isRtl ? 'font-arabic-display' : 'font-display'
                }`}
              >
                {t('ready_heading')}
              </h1>
              <p
                className={`mt-3 m-0 text-[15px] leading-[1.55] text-[var(--color-fg2)] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('ready_body')}
              </p>
              <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                {itemDisplay.coverImage && (
                  <div
                    className="mx-auto mb-3 aspect-[3/4] w-[120px] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-bg-deep)]"
                    aria-hidden="true"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={itemDisplay.coverImage}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <p
                  className={`m-0 text-[16px] font-bold text-[var(--color-fg1)] line-clamp-2 ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {itemTitle}
                </p>
                {fromName && (
                  <p
                    className={`mt-1 m-0 text-[13px] text-[var(--color-fg3)] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {t('from_label')}: {fromName}
                  </p>
                )}
                {gift.senderMessage && (
                  <p
                    className={`mt-3 m-0 text-[14px] italic text-[var(--color-fg2)] leading-[1.55] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    “{gift.senderMessage}”
                  </p>
                )}
              </div>
              {errorKey && (
                <p
                  role="alert"
                  className={`mt-4 m-0 text-[14px] text-[var(--color-destructive)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t(`errors.${errorKey}`)}
                </p>
              )}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={isPending}
                  className="btn-pill btn-pill-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('ready_cta')}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
