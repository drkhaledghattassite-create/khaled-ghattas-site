'use client'

import { useEffect, useId, useMemo, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { Link, useRouter } from '@/lib/i18n/navigation'
import type { Book, BookingWithHolds } from '@/lib/db/queries'
import {
  EASE_EDITORIAL,
  fadeUp,
  pageTurnReducedMotion,
  pageTurnVariants,
  type PageTurnCustom,
} from '@/lib/motion/variants'
import {
  createUserGiftAction,
  type CreateUserGiftActionResult,
} from '@/app/[locale]/(public)/gifts/actions'
import { Step1Choose } from './SendGiftSteps/Step1Choose'
import { Step2Recipient } from './SendGiftSteps/Step2Recipient'
import { Step3Note } from './SendGiftSteps/Step3Note'
import { Step4Review } from './SendGiftSteps/Step4Review'
import type { SelectedItem, Tab } from './SendGiftSteps/types'

const TOTAL_STEPS = 4
type Step = 1 | 2 | 3 | 4

function bookToItem(b: Book, type: 'book' | 'session'): SelectedItem {
  const decimal = Number.parseFloat(String(b.price))
  const priceCents = Math.round(decimal * 100)
  return {
    type,
    id: b.id,
    titleAr: b.titleAr,
    titleEn: b.titleEn,
    coverImage: b.coverImage,
    priceCents,
    currency: (b.currency || 'USD').toLowerCase(),
  }
}

function bookingToItem(b: BookingWithHolds): SelectedItem {
  return {
    type: 'booking',
    id: b.id,
    titleAr: b.titleAr,
    titleEn: b.titleEn,
    coverImage: b.coverImage,
    priceCents: b.priceUsd,
    currency: (b.currency || 'usd').toLowerCase(),
  }
}

export function SendGiftPage({
  locale,
  books,
  sessions,
  bookings,
  isLoggedIn,
  featureEnabled,
  preselectedType,
  preselectedId,
  cancelled,
}: {
  locale: string
  books: Book[]
  sessions: Book[]
  bookings: BookingWithHolds[]
  isLoggedIn: boolean
  featureEnabled: boolean
  preselectedType?: Tab | null
  preselectedId?: string | null
  cancelled?: boolean
}) {
  const t = useTranslations('gifts.send')
  const localeCtx = useLocale()
  const isRtl = localeCtx === 'ar'
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const emailInputId = useId()
  const textareaId = useId()

  const initialState = useMemo<{
    tab: Tab
    selected: SelectedItem | null
    step: Step
  }>(() => {
    if (!preselectedType || !preselectedId) {
      return { tab: 'book', selected: null, step: 1 }
    }
    if (preselectedType === 'book') {
      const b = books.find((x) => x.id === preselectedId)
      if (b) return { tab: 'book', selected: bookToItem(b, 'book'), step: 2 }
    } else if (preselectedType === 'session') {
      const s = sessions.find((x) => x.id === preselectedId)
      if (s) return { tab: 'session', selected: bookToItem(s, 'session'), step: 2 }
    } else if (preselectedType === 'booking') {
      const bk = bookings.find((x) => x.id === preselectedId)
      if (bk) return { tab: 'booking', selected: bookingToItem(bk), step: 2 }
    }
    return { tab: preselectedType, selected: null, step: 1 }
  }, [preselectedType, preselectedId, books, sessions, bookings])

  const [tab, setTab] = useState<Tab>(initialState.tab)
  const [selected, setSelected] = useState<SelectedItem | null>(
    initialState.selected,
  )
  const [step, setStep] = useState<Step>(initialState.step)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientLocale, setRecipientLocale] = useState<'ar' | 'en'>(
    locale === 'ar' ? 'ar' : 'en',
  )
  const [message, setMessage] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (cancelled) toast(t('checkout_cancelled'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const counts = useMemo<Record<Tab, number>>(
    () => ({
      book: books.length,
      session: sessions.length,
      booking: bookings.length,
    }),
    [books.length, sessions.length, bookings.length],
  )

  const items = useMemo<SelectedItem[]>(
    () =>
      tab === 'book'
        ? books.map((b) => bookToItem(b, 'book'))
        : tab === 'session'
          ? sessions.map((b) => bookToItem(b, 'session'))
          : bookings.map(bookingToItem),
    [tab, books, sessions, bookings],
  )

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)
  const stepValid: Record<Step, boolean> = {
    1: !!selected,
    2: isValidEmail,
    3: true,
    4: !!selected && isValidEmail,
  }

  function handleSelect(item: SelectedItem) {
    setSelected(item)
    setErrorKey(null)
  }

  function handleTabChange(nextTab: Tab) {
    setTab(nextTab)
    if (selected && selected.type !== nextTab) setSelected(null)
  }

  function goNext() {
    if (!stepValid[step]) return
    if (step < TOTAL_STEPS) {
      setDirection(1)
      setStep((step + 1) as Step)
    }
  }

  function goPrev() {
    if (step > 1) {
      setDirection(-1)
      setStep((step - 1) as Step)
    }
  }

  function handleSkipNote() {
    setMessage('')
    setDirection(1)
    setStep(4)
  }

  function handleSubmit() {
    setErrorKey(null)
    if (!selected) {
      setErrorKey('select_item_first')
      return
    }
    if (!isLoggedIn) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/${locale}/gifts/send`)}`,
      )
      return
    }
    startTransition(async () => {
      const result: CreateUserGiftActionResult = await createUserGiftAction({
        itemType:
          selected.type === 'book'
            ? 'BOOK'
            : selected.type === 'session'
              ? 'SESSION'
              : 'BOOKING',
        itemId: selected.id,
        recipientEmail,
        senderMessage: message.trim() ? message.trim() : undefined,
        locale: recipientLocale,
      })
      if (!result.ok) {
        setErrorKey(result.error)
        toast.error(t(`errors.${result.error}`))
        return
      }
      window.location.href = result.checkoutUrl
    })
  }

  if (!featureEnabled) {
    return (
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="min-h-[60dvh] flex items-center justify-center bg-[var(--color-bg)] py-[var(--section-pad-y)] px-[var(--section-pad-x)]"
      >
        <div className="max-w-[480px] text-center">
          <p
            className={`m-0 text-[16px] text-[var(--color-fg2)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('feature_disabled')}
          </p>
        </div>
      </div>
    )
  }

  const variants = prefersReducedMotion ? pageTurnReducedMotion : pageTurnVariants
  const custom: PageTurnCustom = { direction, isRtl }
  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-dvh bg-[var(--color-bg)]"
    >
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--section-pad-x)] py-[var(--section-pad-y)]">
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.7, ease: EASE_EDITORIAL }}
          className="mb-10 max-w-[640px]"
        >
          <span
            className={`section-eyebrow ${
              isRtl ? 'eyebrow-invitation' : 'eyebrow-accent'
            }`}
          >
            {t('eyebrow')}
          </span>
          <h1
            className={`mt-3 m-0 text-[clamp(32px,5vw,48px)] leading-[1.15] font-bold tracking-[-0.01em] text-[var(--color-fg1)] ${fontDisplay}`}
          >
            {t('heading')}
          </h1>
          <p
            className={`mt-4 m-0 text-[18px] leading-[1.55] text-[var(--color-fg2)] ${fontBody}`}
          >
            {t('subheading')}
          </p>
        </motion.section>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[var(--color-border)]">
            <div
              className="flex items-center gap-1.5"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
              aria-valuenow={step}
              aria-label={t('step_label', { current: step, total: TOTAL_STEPS })}
            >
              {[1, 2, 3, 4].map((i) => {
                const isCurrent = i === step
                const isDone = i < step
                return (
                  <motion.span
                    key={i}
                    animate={{ width: isCurrent ? 36 : 20 }}
                    transition={{ duration: 0.3, ease: EASE_EDITORIAL }}
                    className={`block h-[2px] rounded-[var(--radius-pill)] ${
                      isDone || isCurrent
                        ? 'bg-[var(--color-accent)]'
                        : 'bg-[var(--color-border-strong)]'
                    }`}
                  />
                )
              })}
            </div>
            <span
              className={`text-[12px] uppercase tracking-[0.06em] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body normal-case tracking-normal' : 'font-display'
              }`}
            >
              {t('step_label', { current: step, total: TOTAL_STEPS })}
            </span>
          </div>

          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" custom={custom} initial={false}>
              <motion.div
                key={step}
                custom={custom}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                className="px-5 py-8 sm:px-8"
              >
                {step === 1 && (
                  <Step1Choose
                    isRtl={isRtl}
                    locale={locale}
                    tab={tab}
                    setTab={handleTabChange}
                    items={items}
                    selected={selected}
                    onSelect={handleSelect}
                    counts={counts}
                  />
                )}
                {step === 2 && (
                  <Step2Recipient
                    isRtl={isRtl}
                    recipientEmail={recipientEmail}
                    setRecipientEmail={setRecipientEmail}
                    recipientLocale={recipientLocale}
                    setRecipientLocale={setRecipientLocale}
                    emailInputId={emailInputId}
                  />
                )}
                {step === 3 && (
                  <Step3Note
                    isRtl={isRtl}
                    locale={locale}
                    message={message}
                    setMessage={setMessage}
                    onSkip={handleSkipNote}
                    textareaId={textareaId}
                  />
                )}
                {step === 4 && (
                  <Step4Review
                    isRtl={isRtl}
                    locale={locale}
                    selected={selected}
                    recipientEmail={recipientEmail}
                    recipientLocale={recipientLocale}
                    message={message}
                    onBackToNote={() => {
                      setDirection(-1)
                      setStep(3)
                    }}
                    onSubmit={handleSubmit}
                    isPending={isPending}
                    errorKey={errorKey}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {step < 4 && (
            <nav
              aria-label={t('nav.aria_label')}
              className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg)]"
            >
              <span>
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={goPrev}
                    className={`btn-pill btn-pill-secondary inline-flex items-center gap-2 ${fontBody}`}
                  >
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
                      style={{ transform: isRtl ? 'scaleX(-1)' : undefined }}
                    >
                      <path d="M19 12H5" />
                      <path d="M11 5l-7 7 7 7" />
                    </svg>
                    {t('nav.back')}
                  </button>
                ) : (
                  <span aria-hidden="true" />
                )}
              </span>

              <span
                className={`hidden sm:inline text-[12px] text-[var(--color-fg3)] ${fontBody}`}
              >
                {t('nav.hint')}
              </span>

              <button
                type="button"
                onClick={goNext}
                disabled={!stepValid[step]}
                className={`btn-pill btn-pill-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${fontBody}`}
              >
                {t('nav.next')}
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
                  style={{ transform: isRtl ? 'scaleX(-1)' : undefined }}
                >
                  <path d="M5 12h14" />
                  <path d="M13 5l7 7-7 7" />
                </svg>
              </button>
            </nav>
          )}
        </div>

        {!isLoggedIn && step >= 2 && (
          <p
            className={`mt-6 text-center text-[13px] text-[var(--color-fg3)] ${fontBody}`}
          >
            {t('login_required')}{' '}
            <Link
              href={`/login?redirect=${encodeURIComponent(`/${locale}/gifts/send`)}`}
              className={`underline underline-offset-4 text-[var(--color-fg2)] hover:text-[var(--color-accent)] ${fontBody}`}
            >
              {t('login_cta')}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
