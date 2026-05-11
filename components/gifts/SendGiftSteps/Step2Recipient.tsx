'use client'

import { useTranslations } from 'next-intl'

type Props = {
  isRtl: boolean
  recipientEmail: string
  setRecipientEmail: (v: string) => void
  recipientLocale: 'ar' | 'en'
  setRecipientLocale: (v: 'ar' | 'en') => void
  emailInputId: string
}

export function Step2Recipient({
  isRtl,
  recipientEmail,
  setRecipientEmail,
  recipientLocale,
  setRecipientLocale,
  emailInputId,
}: Props) {
  const t = useTranslations('gifts.send')
  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  return (
    <div className="grid gap-8 max-w-[560px] mx-auto">
      <header className="grid gap-2 text-center">
        <h2
          className={`m-0 text-[clamp(22px,3vw,28px)] font-bold leading-[1.15] text-[var(--color-fg1)] ${fontDisplay}`}
        >
          {t('step_titles.recipient')}
        </h2>
        <p
          className={`m-0 mx-auto max-w-[440px] text-[15px] leading-[1.55] text-[var(--color-fg2)] ${fontBody}`}
        >
          {t('step_subs.recipient')}
        </p>
      </header>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <label
            htmlFor={emailInputId}
            className={`text-[13px] font-semibold text-[var(--color-fg2)] ${fontBody}`}
          >
            {t('form_recipient_label')}
          </label>
          <input
            id={emailInputId}
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder={t('form_recipient_placeholder')}
            className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] px-4 py-3 text-[15px] text-[var(--color-fg1)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_var(--color-accent-soft)] transition-colors"
            dir="ltr"
          />
        </div>

        <div className="grid gap-2">
          <span
            className={`text-[13px] font-semibold text-[var(--color-fg2)] ${fontBody}`}
          >
            {t('form_locale_label')}
          </span>
          <div
            role="group"
            aria-label={t('form_locale_label')}
            className="grid grid-cols-2 gap-2"
          >
            {(['ar', 'en'] as const).map((loc) => {
              const active = recipientLocale === loc
              return (
                <button
                  key={loc}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setRecipientLocale(loc)}
                  className={`rounded-[var(--radius-md)] border px-4 py-3 text-[14px] font-semibold transition-all ${
                    active
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                      : 'border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[var(--color-fg2)] hover:border-[var(--color-fg2)]'
                  } ${fontBody}`}
                >
                  {t(loc === 'ar' ? 'form_locale_ar' : 'form_locale_en')}
                </button>
              )
            })}
          </div>
        </div>

        <p
          className={`m-0 text-[13px] leading-[1.55] text-[var(--color-fg3)] ${fontBody}`}
        >
          {t('policy_note')}
        </p>
      </div>
    </div>
  )
}
