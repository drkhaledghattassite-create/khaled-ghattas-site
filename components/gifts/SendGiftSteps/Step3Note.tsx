'use client'

import { useTranslations } from 'next-intl'

type Props = {
  isRtl: boolean
  locale: string
  message: string
  setMessage: (v: string) => void
  onSkip: () => void
  textareaId: string
}

const MAX = 500

function toArDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}

export function Step3Note({
  isRtl,
  locale,
  message,
  setMessage,
  onSkip,
  textareaId,
}: Props) {
  const t = useTranslations('gifts.send')
  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  const remaining = MAX - message.length
  const showCounter = message.length > 400
  const near = message.length > 460
  const remainingFmt = locale === 'ar' ? toArDigits(remaining) : String(remaining)

  return (
    <div className="grid gap-6 max-w-[600px] mx-auto">
      <header className="grid gap-2 text-center">
        <h2
          className={`m-0 text-[clamp(22px,3vw,28px)] font-bold leading-[1.15] text-[var(--color-fg1)] ${fontDisplay}`}
        >
          {t('step_titles.note')}
        </h2>
        <p
          className={`m-0 mx-auto max-w-[440px] text-[15px] leading-[1.55] text-[var(--color-fg2)] ${fontBody}`}
        >
          {t('step_subs.note')}
        </p>
      </header>

      <div className="grid gap-3">
        <div className="relative rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-deep)] p-1 shadow-[var(--shadow-card)]">
          <textarea
            id={textareaId}
            rows={7}
            maxLength={MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('form_message_placeholder')}
            dir={isRtl ? 'rtl' : 'ltr'}
            className={`block w-full resize-none rounded-[calc(var(--radius-lg)-4px)] bg-[var(--color-bg-deep)] px-4 py-3 text-[15px] leading-[1.7] text-[var(--color-fg1)] placeholder:text-[var(--color-fg3)] focus:outline-none ${
              isRtl ? 'font-arabic-body' : 'font-display italic'
            }`}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
            className={`text-[14px] underline-offset-4 hover:underline text-[var(--color-fg2)] hover:text-[var(--color-accent)] transition-colors ${fontBody}`}
          >
            {t('note.skip')}
          </button>
          <span
            aria-live="polite"
            className={`text-[12px] transition-opacity ${
              showCounter ? 'opacity-100' : 'opacity-0'
            } ${near ? 'text-[var(--color-accent)]' : 'text-[var(--color-fg3)]'} ${fontBody}`}
          >
            {near
              ? t('note.counter_near', { count: remainingFmt })
              : t('note.counter_left', { count: remainingFmt })}
          </span>
        </div>
      </div>
    </div>
  )
}
