'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale, useTranslations } from 'next-intl'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  bookingInterestSchema,
  type BookingInterestInput,
} from '@/lib/validators/booking'
import { createBookingInterestAction } from '@/app/[locale]/(public)/booking/actions'

type Payload = {
  bookingId: string
  titleAr: string
  titleEn: string
  mode: 'sold_out' | 'closed'
}

type Props = {
  payload: Payload
  onClose: () => void
}

const inputClass =
  'w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3.5 py-3 text-[15px] text-[var(--color-fg1)] placeholder:text-[var(--color-fg3)]/70 outline-none transition-colors focus:border-[var(--color-accent)]'

export function InterestModal({ payload, onClose }: Props) {
  const t = useTranslations('booking.interest_modal')
  const tShared = useTranslations('booking.shared')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const title = isRtl ? payload.titleAr : payload.titleEn
  const heading =
    payload.mode === 'sold_out' ? t('sold_out_title') : t('closed_title')
  const sub =
    payload.mode === 'sold_out' ? t('sold_out_body') : t('closed_body')

  const form = useForm<BookingInterestInput>({
    resolver: zodResolver(bookingInterestSchema),
    defaultValues: {
      bookingId: payload.bookingId,
      additionalNotes: '',
    },
  })

  async function onSubmit(values: BookingInterestInput) {
    setSubmitting(true)
    try {
      const res = await createBookingInterestAction(values)
      if (res.ok) {
        setDone(true)
        return
      }
      const errorKey =
        res.error === 'validation'
          ? 'error_validation'
          : res.error === 'rate_limited'
          ? 'error_rate_limited'
          : 'error_generic'
      toast.error(tShared(errorKey))
    } catch (err) {
      console.error('[InterestModal]', err)
      toast.error(tShared('error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <span
            className={`block max-w-full truncate text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)] ${
              isRtl
                ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                : 'font-display'
            }`}
            title={title}
          >
            {title}
          </span>
          <DialogTitle
            className={`text-[clamp(20px,2.4vw,26px)] leading-[1.2] tracking-[-0.01em] ${
              isRtl
                ? 'font-arabic-display'
                : 'font-arabic-display !tracking-[-0.02em]'
            }`}
          >
            {done ? t('submitted_title') : heading}
          </DialogTitle>
          {!done && (
            <DialogDescription
              className={isRtl ? 'font-arabic-body' : 'font-display'}
            >
              {sub}
            </DialogDescription>
          )}
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-3 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Check className="h-6 w-6" />
            </span>
            <p
              className={`max-w-[360px] text-[16px] leading-[1.6] text-[var(--color-fg2)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {t('submitted_body')}
            </p>
            <button
              type="button"
              onClick={onClose}
              className={`btn-pill btn-pill-secondary ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {tShared('close')}
            </button>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-5"
          >
            <input type="hidden" {...form.register('bookingId')} />
            <div className="flex flex-col gap-2">
              <label
                htmlFor="bk-interest-notes"
                className={`text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg2)] ${
                  isRtl
                    ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                    : 'font-display'
                }`}
              >
                {t('field_notes')}
              </label>
              <textarea
                id="bk-interest-notes"
                rows={4}
                placeholder={t('field_notes_placeholder')}
                className={`${inputClass} min-h-[96px] resize-y`}
                {...form.register('additionalNotes')}
              />
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={onClose}
                className={`btn-pill btn-pill-secondary ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {tShared('cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`btn-pill btn-pill-primary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {submitting && (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                )}
                {submitting ? t('submitting') : t('submit')}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
