'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion, useReducedMotion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Link, useRouter } from '@/lib/i18n/navigation'
import type { Gift } from '@/lib/db/schema'
import type { GiftableItemType } from '@/lib/validators/gift'
import {
  EASE_EDITORIAL,
  claimForwardCta,
  claimRibbon,
  claimSuccessReducedMotion,
  claimYours,
  fadeUp,
} from '@/lib/motion/variants'
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

function ItemCard({
  isRtl,
  title,
  itemType,
  coverImage,
  fromLabel,
}: {
  isRtl: boolean
  title: string
  itemType: GiftableItemType
  coverImage: string | null
  fromLabel: string | null
}) {
  const t = useTranslations('gifts.claim')
  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  return (
    <article className="text-center">
      <div
        className="mx-auto mb-4 aspect-[3/4] w-[160px] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-bg-deep)] shadow-[var(--shadow-card)]"
        aria-hidden="true"
      >
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[var(--color-accent)]">
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 7l9-4 9 4" />
              <path d="M5 8v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
              <path d="M9 19v-7h6v7" />
            </svg>
          </span>
        )}
      </div>
      <p
        className={`m-0 text-[12px] uppercase tracking-[0.08em] text-[var(--color-fg3)] ${
          isRtl ? 'font-arabic-body normal-case tracking-normal' : 'font-display'
        }`}
      >
        {t(`item_type.${itemType.toLowerCase()}` as never)}
      </p>
      <h2
        className={`mt-2 m-0 text-[clamp(22px,3vw,28px)] font-bold leading-[1.2] text-[var(--color-fg1)] ${fontDisplay}`}
      >
        {title}
      </h2>
      {fromLabel && (
        <p
          className={`mt-2 m-0 text-[14px] text-[var(--color-fg2)] ${fontBody}`}
        >
          {fromLabel}
        </p>
      )}
    </article>
  )
}

function NoteCard({
  isRtl,
  note,
}: {
  isRtl: boolean
  note: string
}) {
  return (
    <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-deep)] px-5 py-5 shadow-[var(--shadow-card)]">
      <p
        className={`m-0 text-[15px] leading-[1.75] text-[var(--color-fg1)] whitespace-pre-wrap ${
          isRtl ? 'font-arabic-body' : 'font-display italic'
        }`}
      >
        {note}
      </p>
    </div>
  )
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
  const prefersReducedMotion = useReducedMotion()
  const [isPending, startTransition] = useTransition()
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [claimed, setClaimed] = useState<{ redirectPath: string } | null>(null)

  const expired = !!gift && gift.expiresAt.getTime() <= Date.now()
  const valid = !!gift && gift.status === 'PENDING' && !expired
  const sessionEmailLc = sessionUser?.email?.trim().toLowerCase() ?? null
  const giftEmailLc = gift?.recipientEmail?.toLowerCase() ?? null
  const emailMatch =
    sessionEmailLc != null &&
    giftEmailLc != null &&
    sessionEmailLc === giftEmailLc

  let renderState: 'invalid' | 'logged_out' | 'mismatch' | 'ready' = 'invalid'
  if (!valid) renderState = 'invalid'
  else if (!sessionUser) renderState = 'logged_out'
  else if (!emailMatch) renderState = 'mismatch'
  else renderState = 'ready'

  const itemTitle =
    itemDisplay && (isRtl ? itemDisplay.titleAr : itemDisplay.titleEn)
  const fromName =
    senderDisplayName ??
    (gift?.source === 'ADMIN_GRANT' ? t('from_admin') : null)
  const fromLabel = fromName ? `${t('from_label')} ${fromName}` : null

  function handleClaim() {
    setErrorKey(null)
    startTransition(async () => {
      const result = await claimGiftAction({ token })
      if (!result.ok) {
        setErrorKey(result.error)
        toast.error(t(`errors.${result.error}`))
        return
      }
      setClaimed({ redirectPath: result.redirectPath })
    })
  }

  async function handleSignOut() {
    await authClient.signOut()
    router.refresh()
  }

  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'
  const isSuccess = claimed !== null
  const itemType = itemDisplay?.itemType ?? 'BOOK'
  const forwardCtaKey =
    itemType === 'BOOK'
      ? 'cta.book'
      : itemType === 'SESSION'
        ? 'cta.session'
        : 'cta.booking'

  const ribbonOrigin = isRtl ? 'right' : 'left'

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
          className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 shadow-[var(--shadow-card)]"
        >
          {renderState === 'invalid' && (
            <div className="text-center">
              <span
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-[var(--color-fg3)]"
                aria-hidden="true"
              >
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="14" rx="1.5" />
                  <path d="m3 7 9 7 9-7" />
                </svg>
              </span>
              <span
                className={`section-eyebrow ${
                  isRtl ? 'eyebrow-invitation' : 'eyebrow-accent'
                }`}
              >
                {t('eyebrow')}
              </span>
              <h1
                className={`mt-3 m-0 text-[24px] font-bold leading-[1.25] text-[var(--color-fg1)] ${fontDisplay}`}
              >
                {t('invalid_heading')}
              </h1>
              <p
                className={`mt-3 m-0 text-[15px] leading-[1.55] text-[var(--color-fg2)] ${fontBody}`}
              >
                {t('invalid_body')}
              </p>
              <div className="mt-6">
                <Link href="/" className="btn-pill btn-pill-primary">
                  {t('invalid_browse_cta')}
                </Link>
              </div>
            </div>
          )}

          {renderState === 'logged_out' && itemDisplay && gift && itemTitle && (
            <>
              <header className="mb-6 text-center">
                <span
                  className={`section-eyebrow ${
                    isRtl ? 'eyebrow-invitation' : 'eyebrow-accent'
                  }`}
                >
                  {t('eyebrow')}
                </span>
                <h1
                  className={`mt-3 m-0 text-[clamp(28px,4vw,36px)] font-bold leading-[1.2] text-[var(--color-fg1)] ${fontDisplay}`}
                >
                  {t('logged_out_heading')}
                </h1>
              </header>

              <ItemCard
                isRtl={isRtl}
                title={itemTitle}
                itemType={itemDisplay.itemType}
                coverImage={itemDisplay.coverImage}
                fromLabel={fromLabel}
              />

              {gift.senderMessage && (
                <NoteCard isRtl={isRtl} note={gift.senderMessage} />
              )}

              <p
                className={`mt-6 m-0 text-center text-[14px] text-[var(--color-fg3)] ${fontBody}`}
              >
                {t('email_hint', { email: redactEmail(gift.recipientEmail) })}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
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
                className={`mt-5 m-0 text-center text-[12px] text-[var(--color-fg3)] ${fontBody}`}
              >
                {t('expires_at', { date: fmtDate(gift.expiresAt, locale) })}
              </p>
            </>
          )}

          {renderState === 'mismatch' && (
            <div className="text-center">
              <span
                className={`section-eyebrow ${
                  isRtl ? 'eyebrow-invitation' : 'eyebrow-accent'
                }`}
              >
                {t('eyebrow')}
              </span>
              <h1
                className={`mt-3 m-0 text-[24px] font-bold leading-[1.25] text-[var(--color-fg1)] ${fontDisplay}`}
              >
                {t('mismatch_heading')}
              </h1>
              <p
                className={`mt-3 m-0 text-[15px] leading-[1.55] text-[var(--color-fg2)] ${fontBody}`}
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
            </div>
          )}

          {renderState === 'ready' && itemDisplay && gift && itemTitle && (
            <>
              <header className="mb-6 text-center">
                <span
                  className={`section-eyebrow ${
                    isRtl ? 'eyebrow-invitation' : 'eyebrow-accent'
                  }`}
                >
                  {t('eyebrow')}
                </span>
                <h1
                  className={`mt-3 m-0 text-[clamp(28px,4vw,36px)] font-bold leading-[1.2] text-[var(--color-fg1)] ${fontDisplay}`}
                >
                  {t('ready_heading')}
                </h1>
                <motion.p
                  initial={false}
                  animate={{
                    opacity: isSuccess ? 0 : 1,
                    height: isSuccess ? 0 : 'auto',
                    marginTop: isSuccess ? 0 : 12,
                  }}
                  transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
                  className={`m-0 text-[15px] leading-[1.55] text-[var(--color-fg2)] overflow-hidden ${fontBody}`}
                >
                  {t('ready_body')}
                </motion.p>
              </header>

              {prefersReducedMotion ? (
                <ItemCard
                  isRtl={isRtl}
                  title={itemTitle}
                  itemType={itemDisplay.itemType}
                  coverImage={itemDisplay.coverImage}
                  fromLabel={fromLabel}
                />
              ) : (
                <div className="relative pt-3">
                  <motion.div
                    aria-hidden="true"
                    variants={claimRibbon}
                    initial="hidden"
                    animate={isSuccess ? 'visible' : 'hidden'}
                    className="absolute inset-x-0 top-0 h-[1px] bg-[var(--color-accent)]"
                    style={{ transformOrigin: ribbonOrigin }}
                  />
                  <motion.div
                    initial={false}
                    animate={{ y: isSuccess ? -6 : 0 }}
                    transition={{
                      duration: 0.4,
                      ease: EASE_EDITORIAL,
                      delay: isSuccess ? 0.38 : 0,
                    }}
                  >
                    <ItemCard
                      isRtl={isRtl}
                      title={itemTitle}
                      itemType={itemDisplay.itemType}
                      coverImage={itemDisplay.coverImage}
                      fromLabel={fromLabel}
                    />
                  </motion.div>
                </div>
              )}

              {gift.senderMessage && (
                <NoteCard isRtl={isRtl} note={gift.senderMessage} />
              )}

              <AnimatePresence initial={false} mode="wait">
                {isSuccess ? (
                  <motion.div
                    key="success-yours"
                    variants={
                      prefersReducedMotion ? claimSuccessReducedMotion : claimYours
                    }
                    initial="hidden"
                    animate="visible"
                    className="mt-6 flex justify-center"
                  >
                    <span
                      className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-accent-soft)] px-4 py-2 text-[13px] font-semibold text-[var(--color-accent)] ${fontBody}`}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {t('yours_badge')}
                    </span>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {errorKey && !isSuccess && (
                <p
                  role="alert"
                  className={`mt-5 m-0 text-center text-[14px] text-[var(--color-destructive)] ${fontBody}`}
                >
                  {t(`errors.${errorKey}`)}
                </p>
              )}

              <div className="mt-7 flex flex-col items-center gap-3">
                <AnimatePresence initial={false} mode="wait">
                  {isSuccess ? (
                    <motion.div
                      key="forward-cta"
                      variants={
                        prefersReducedMotion
                          ? claimSuccessReducedMotion
                          : claimForwardCta
                      }
                      initial="hidden"
                      animate="visible"
                    >
                      <Link
                        href={claimed.redirectPath}
                        className="btn-pill btn-pill-primary inline-flex items-center gap-2"
                      >
                        {t(forwardCtaKey as never)}
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          style={{
                            transform: isRtl ? 'scaleX(-1)' : undefined,
                          }}
                        >
                          <path d="M5 12h14" />
                          <path d="M13 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="open-cta"
                      type="button"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                      exit={{
                        opacity: 0,
                        transition: { duration: 0.2, ease: EASE_EDITORIAL },
                      }}
                      onClick={handleClaim}
                      disabled={isPending}
                      className="btn-pill btn-pill-accent inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? t('ready_loading') : t('ready_cta')}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{
                          transform: isRtl ? 'scaleX(-1)' : undefined,
                        }}
                      >
                        <path d="M5 12h14" />
                        <path d="M13 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
