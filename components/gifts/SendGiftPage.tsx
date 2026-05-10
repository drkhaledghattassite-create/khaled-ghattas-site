'use client'

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Link, useRouter } from '@/lib/i18n/navigation'
import type { Book, BookingWithHolds } from '@/lib/db/queries'
import { EASE_EDITORIAL, fadeUp } from '@/lib/motion/variants'
import { createUserGiftAction, type CreateUserGiftActionResult } from '@/app/[locale]/(public)/gifts/actions'

type Tab = 'book' | 'session' | 'booking'

type SelectedItem =
  | { type: 'book'; id: string; titleAr: string; titleEn: string; coverImage: string; priceCents: number; currency: string }
  | { type: 'session'; id: string; titleAr: string; titleEn: string; coverImage: string; priceCents: number; currency: string }
  | { type: 'booking'; id: string; titleAr: string; titleEn: string; coverImage: string | null; priceCents: number; currency: string }

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

function fmtAmount(cents: number, currency: string, locale: string): string {
  const major = (cents / 100).toFixed(2)
  const cur = currency.toUpperCase()
  return locale === 'ar' ? `${major} ${cur}` : `${cur} ${major}`
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

  // Compute the initial tab + selected item from query-string pre-selection
  // (e.g., user clicked "Send as gift" on /books/[slug]). Falls back to
  // 'book' when no preselection or the id doesn't match anything live.
  const initialState = useMemo<{ tab: Tab; selected: SelectedItem | null }>(() => {
    if (!preselectedType || !preselectedId) return { tab: 'book', selected: null }
    if (preselectedType === 'book') {
      const b = books.find((x) => x.id === preselectedId)
      if (b) return { tab: 'book', selected: bookToItem(b, 'book') }
    } else if (preselectedType === 'session') {
      const s = sessions.find((x) => x.id === preselectedId)
      if (s) return { tab: 'session', selected: bookToItem(s, 'session') }
    } else if (preselectedType === 'booking') {
      const bk = bookings.find((x) => x.id === preselectedId)
      if (bk) return { tab: 'booking', selected: bookingToItem(bk) }
    }
    return { tab: preselectedType, selected: null }
  }, [preselectedType, preselectedId, books, sessions, bookings])

  const [tab, setTab] = useState<Tab>(initialState.tab)
  const [selected, setSelected] = useState<SelectedItem | null>(initialState.selected)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientLocale, setRecipientLocale] = useState<'ar' | 'en'>(
    locale === 'ar' ? 'ar' : 'en',
  )
  const [message, setMessage] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Stripe cancel redirect: surface a non-blocking toast so the user
  // knows why they're back on the form and isn't left guessing.
  useEffect(() => {
    if (cancelled) toast(t('checkout_cancelled'))
    // run-once on mount with the value at-mount time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSelect(item: SelectedItem) {
    setSelected(item)
    setErrorKey(null)
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
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
        // Surface a toast in addition to the inline error so users notice
        // even when the form is scrolled below the fold.
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

  const items =
    tab === 'book' ? books.map((b) => bookToItem(b, 'book'))
    : tab === 'session' ? sessions.map((b) => bookToItem(b, 'session'))
    : bookings.map(bookingToItem)

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-dvh bg-[var(--color-bg)]"
    >
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--section-pad-x)] py-[var(--section-pad-y)]">
        {/* Hero */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.7, ease: EASE_EDITORIAL }}
          className="mb-12 max-w-[640px]"
        >
          <span
            className={`section-eyebrow ${isRtl ? 'eyebrow-invitation' : 'eyebrow-accent'}`}
          >
            {t('eyebrow')}
          </span>
          <h1
            className={`mt-3 m-0 text-[clamp(32px,5vw,48px)] leading-[1.15] font-bold tracking-[-0.01em] text-[var(--color-fg1)] ${
              isRtl ? 'font-arabic-display' : 'font-display'
            }`}
          >
            {t('heading')}
          </h1>
          <p
            className={`mt-4 m-0 text-[18px] leading-[1.55] text-[var(--color-fg2)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('subheading')}
          </p>
        </motion.section>

        {/* Step 1: Pick item */}
        <section className="mb-12">
          <h2
            className={`m-0 mb-4 text-[20px] font-bold text-[var(--color-fg1)] ${
              isRtl ? 'font-arabic-display' : 'font-display'
            }`}
          >
            {t('step_pick_item')}
          </h2>

          {/* Tabs */}
          <div
            role="tablist"
            className="mb-6 flex flex-wrap gap-2 border-b border-[var(--color-border)]"
          >
            {(['book', 'session', 'booking'] as Tab[]).map((tabKey) => {
              const active = tab === tabKey
              return (
                <button
                  key={tabKey}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTab(tabKey)
                    setSelected(null)
                  }}
                  className={`relative px-4 py-3 text-[14px] font-semibold transition-colors ${
                    active
                      ? 'text-[var(--color-fg1)]'
                      : 'text-[var(--color-fg3)] hover:text-[var(--color-fg2)]'
                  } ${isRtl ? 'font-arabic-body' : 'font-display'}`}
                >
                  {t(`tabs.${tabKey}`)}
                  {active && (
                    <motion.span
                      layoutId="gift-tab-rule"
                      transition={{ duration: 0.3, ease: EASE_EDITORIAL }}
                      className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--color-accent)]"
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Item grid */}
          {items.length === 0 ? (
            <p
              className={`text-[15px] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {t(
                tab === 'book'
                  ? 'empty_books'
                  : tab === 'session'
                    ? 'empty_sessions'
                    : 'empty_bookings',
              )}
            </p>
          ) : (
            <ul className="m-0 p-0 list-none grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
              {items.map((item) => {
                const isSelected = selected?.id === item.id && selected?.type === item.type
                const title = isRtl ? item.titleAr : item.titleEn
                return (
                  <li key={`${item.type}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`w-full text-start rounded-[var(--radius-lg)] border p-3 transition-colors ${
                        isSelected
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]/40'
                          : 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-strong)]'
                      }`}
                    >
                      {item.coverImage && (
                        <div
                          className="aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-bg-deep)]"
                          aria-hidden="true"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.coverImage}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <p
                        className={`mt-3 m-0 text-[14px] font-semibold leading-[1.35] line-clamp-2 text-[var(--color-fg1)] ${
                          isRtl ? 'font-arabic-body' : 'font-display'
                        }`}
                      >
                        {title}
                      </p>
                      <p
                        className={`mt-1 m-0 text-[12px] text-[var(--color-fg3)] ${
                          isRtl ? 'font-arabic-body' : 'font-display'
                        }`}
                      >
                        {fmtAmount(item.priceCents, item.currency, locale)}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Step 2: Recipient + Step 3: Summary, both inside the form */}
        <form onSubmit={onSubmit} className="grid gap-8 max-w-[640px]">
          <section>
            <h2
              className={`m-0 mb-4 text-[20px] font-bold text-[var(--color-fg1)] ${
                isRtl ? 'font-arabic-display' : 'font-display'
              }`}
            >
              {t('step_recipient')}
            </h2>
            <div className="grid gap-4">
              <label className="grid gap-1.5">
                <span
                  className={`text-[13px] font-semibold text-[var(--color-fg2)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('form_recipient_label')}
                </span>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder={t('form_recipient_placeholder')}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-[14px] text-[var(--color-fg1)] focus:outline-none focus:border-[var(--color-accent)]"
                  dir="ltr"
                />
              </label>

              <label className="grid gap-1.5">
                <span
                  className={`text-[13px] font-semibold text-[var(--color-fg2)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('form_locale_label')}
                </span>
                <select
                  value={recipientLocale}
                  onChange={(e) => setRecipientLocale(e.target.value as 'ar' | 'en')}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-[14px] text-[var(--color-fg1)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="ar">{t('form_locale_ar')}</option>
                  <option value="en">{t('form_locale_en')}</option>
                </select>
              </label>

              <label className="grid gap-1.5">
                <span
                  className={`text-[13px] font-semibold text-[var(--color-fg2)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('form_message_label')}
                </span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('form_message_placeholder')}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-[14px] text-[var(--color-fg1)] focus:outline-none focus:border-[var(--color-accent)] resize-y min-h-[88px]"
                />
                <span
                  className={`text-[12px] text-[var(--color-fg3)] text-end ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('form_message_counter', { count: message.length })}
                </span>
              </label>

              <p
                className={`m-0 text-[13px] text-[var(--color-fg3)] leading-[1.55] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('policy_note')}
              </p>
            </div>
          </section>

          {/* Summary */}
          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <h2
              className={`m-0 mb-3 text-[16px] font-bold text-[var(--color-fg1)] ${
                isRtl ? 'font-arabic-display' : 'font-display'
              }`}
            >
              {t('summary_heading')}
            </h2>
            {selected ? (
              <dl className="m-0 grid gap-2 text-[14px]">
                <div className="flex items-center justify-between gap-3">
                  <dt
                    className={`text-[var(--color-fg3)] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {t('summary_item')}
                  </dt>
                  <dd
                    className={`m-0 text-end text-[var(--color-fg1)] line-clamp-1 ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {isRtl ? selected.titleAr : selected.titleEn}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt
                    className={`text-[var(--color-fg3)] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {t('summary_type')}
                  </dt>
                  <dd
                    className={`m-0 text-end text-[var(--color-fg1)] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {t(`tabs.${selected.type}`)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt
                    className={`text-[var(--color-fg3)] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {t('summary_recipient')}
                  </dt>
                  <dd
                    className={`m-0 text-end text-[var(--color-fg1)] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {recipientEmail || '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--color-border)] mt-1">
                  <dt
                    className={`text-[var(--color-fg3)] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {t('summary_amount')}
                  </dt>
                  <dd
                    className={`m-0 text-end text-[15px] font-bold text-[var(--color-fg1)] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {fmtAmount(selected.priceCents, selected.currency, locale)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p
                className={`m-0 text-[14px] text-[var(--color-fg3)] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('select_item_first')}
              </p>
            )}
          </section>

          {errorKey && (
            <p
              role="alert"
              className={`m-0 text-[14px] text-[var(--color-destructive)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {t(`errors.${errorKey}`)}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={!selected || isPending}
              className="btn-pill btn-pill-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending
                ? t('submit_loading')
                : selected
                  ? t('submit_cta', {
                      amount: fmtAmount(selected.priceCents, selected.currency, locale),
                    })
                  : t('select_item_first')}
            </button>
            {!isLoggedIn && (
              <Link
                href={`/login?redirect=${encodeURIComponent(`/${locale}/gifts/send`)}`}
                className={`text-[14px] underline text-[var(--color-fg2)] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('login_cta')}
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
