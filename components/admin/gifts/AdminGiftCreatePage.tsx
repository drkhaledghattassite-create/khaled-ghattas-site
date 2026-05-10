'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from '@/lib/i18n/navigation'
import type { Book, BookingWithHolds } from '@/lib/db/queries'
import { createAdminGiftAction } from '@/app/[locale]/(admin)/admin/gifts/actions'

type Tab = 'book' | 'session' | 'booking'

export function AdminGiftCreatePage({
  locale,
  books,
  sessions,
  bookings,
}: {
  locale: 'ar' | 'en'
  books: Book[]
  sessions: Book[]
  bookings: BookingWithHolds[]
}) {
  const t = useTranslations('admin.gifts.create')
  const localeCtx = useLocale()
  const isRtl = localeCtx === 'ar'
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('book')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientLocale, setRecipientLocale] = useState<'ar' | 'en'>(locale)
  const [message, setMessage] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const items: Array<{ id: string; titleAr: string; titleEn: string }> =
    tab === 'book'
      ? books.map((b) => ({ id: b.id, titleAr: b.titleAr, titleEn: b.titleEn }))
      : tab === 'session'
        ? sessions.map((b) => ({ id: b.id, titleAr: b.titleAr, titleEn: b.titleEn }))
        : bookings.map((b) => ({ id: b.id, titleAr: b.titleAr, titleEn: b.titleEn }))

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorKey(null)
    if (!selectedId) {
      setErrorKey('validation')
      return
    }
    startTransition(async () => {
      const result = await createAdminGiftAction({
        itemType: tab === 'book' ? 'BOOK' : tab === 'session' ? 'SESSION' : 'BOOKING',
        itemId: selectedId,
        recipientEmail,
        senderMessage: message.trim() ? message.trim() : undefined,
        locale: recipientLocale,
      })
      if (!result.ok) {
        setErrorKey(result.error)
        return
      }
      router.push('/admin/gifts')
    })
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="max-w-[640px]">
      <header className="mb-6">
        <h1
          className={`m-0 text-[clamp(20px,2.4vw,26px)] font-bold text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-display' : 'font-display'
          }`}
        >
          {t('heading')}
        </h1>
        <p
          className={`mt-2 m-0 text-[14px] text-[var(--color-fg2)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('subheading')}
        </p>
      </header>

      <form onSubmit={onSubmit} className="grid gap-5">
        {/* Item picker */}
        <div className="grid gap-3">
          <div role="tablist" className="flex flex-wrap gap-2 border-b border-[var(--color-border)]">
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
                    setSelectedId(null)
                  }}
                  className={`px-3 py-2 text-[13px] font-semibold transition-colors ${
                    active ? 'text-[var(--color-fg1)] border-b-2 border-[var(--color-accent)]' : 'text-[var(--color-fg3)]'
                  } ${isRtl ? 'font-arabic-body' : 'font-display'}`}
                >
                  {t(`tabs.${tabKey}`)}
                </button>
              )
            })}
          </div>
          {items.length === 0 ? (
            <p
              className={`text-[14px] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              —
            </p>
          ) : (
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value || null)}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-[14px]"
            >
              <option value="">—</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {isRtl ? item.titleAr : item.titleEn}
                </option>
              ))}
            </select>
          )}
        </div>

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
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-[14px]"
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
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-[14px]"
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
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
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-[14px] resize-y min-h-[80px]"
          />
        </label>

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

        <div>
          <button
            type="submit"
            disabled={isPending || !selectedId}
            className="btn-pill btn-pill-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? t('submit_loading') : t('submit_cta')}
          </button>
        </div>
      </form>
    </div>
  )
}
