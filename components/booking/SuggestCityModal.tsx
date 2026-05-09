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
  tourSuggestionSchema,
  type TourSuggestionInput,
} from '@/lib/validators/booking'
import { createTourSuggestionAction } from '@/app/[locale]/(public)/booking/actions'

type Props = {
  onClose: () => void
}

const inputClass =
  'w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3.5 py-3 text-[15px] text-[var(--color-fg1)] placeholder:text-[var(--color-fg3)]/70 outline-none transition-colors focus:border-[var(--color-accent)]'

export function SuggestCityModal({ onClose }: Props) {
  const t = useTranslations('booking.suggest')
  const tShared = useTranslations('booking.shared')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const form = useForm<TourSuggestionInput>({
    resolver: zodResolver(tourSuggestionSchema),
    defaultValues: {
      suggestedCity: '',
      suggestedCountry: '',
      additionalNotes: '',
    },
  })

  async function onSubmit(values: TourSuggestionInput) {
    setSubmitting(true)
    try {
      const res = await createTourSuggestionAction(values)
      if (res.ok) {
        setDone(true)
        return
      }
      const errorKey =
        res.error === 'validation' ? 'error_validation' : 'error_generic'
      toast.error(tShared(errorKey))
    } catch (err) {
      console.error('[SuggestCityModal]', err)
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
            className={`text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)] ${
              isRtl
                ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                : 'font-display'
            }`}
          >
            {t('eyebrow')}
          </span>
          <DialogTitle
            className={`text-[clamp(20px,2.4vw,26px)] leading-[1.2] tracking-[-0.01em] ${
              isRtl
                ? 'font-arabic-display'
                : 'font-arabic-display !tracking-[-0.02em]'
            }`}
          >
            {done ? t('submitted_title') : t('modal_title')}
          </DialogTitle>
          {!done && (
            <DialogDescription
              className={isRtl ? 'font-arabic-body' : 'font-display'}
            >
              {t('modal_desc')}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="bk-country"
                label={t('field_country')}
                placeholder={t('field_country_placeholder')}
                error={form.formState.errors.suggestedCountry?.message}
                isRtl={isRtl}
                inputProps={form.register('suggestedCountry')}
              />
              <Field
                id="bk-city"
                label={t('field_city')}
                placeholder={t('field_city_placeholder')}
                error={form.formState.errors.suggestedCity?.message}
                isRtl={isRtl}
                inputProps={form.register('suggestedCity')}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="bk-notes"
                className={`text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg2)] ${
                  isRtl
                    ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                    : 'font-display'
                }`}
              >
                {t('field_notes')}
              </label>
              <textarea
                id="bk-notes"
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

type FieldProps = {
  id: string
  label: string
  placeholder?: string
  error?: string
  isRtl: boolean
  inputProps: React.InputHTMLAttributes<HTMLInputElement> & {
    ref?: React.Ref<HTMLInputElement>
  }
}

const Field = ({ id, label, placeholder, error, isRtl, inputProps }: FieldProps) => {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={`text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg2)] ${
          isRtl
            ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
            : 'font-display'
        }`}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        className={inputClass}
        {...inputProps}
      />
      {error && (
        <span
          className={`text-[12px] text-[var(--color-status-soldout-fg)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {error}
        </span>
      )}
    </div>
  )
}
