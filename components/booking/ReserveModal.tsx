'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createBookingCheckoutAction } from '@/app/[locale]/(public)/booking/actions'
import { showNavLoader } from '@/lib/motion/nav-transition'

type Payload = {
  bookingId: string
  titleAr: string
  titleEn: string
  cohortLabelAr: string | null
  cohortLabelEn: string | null
  priceUsd: number
  currency: string
  modalEyebrowAr: string
  modalEyebrowEn: string
}

type Props = {
  payload: Payload
  onClose: () => void
}

function fmtPrice(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function ReserveModal({ payload, onClose }: Props) {
  const t = useTranslations('booking.reserve_modal')
  const tShared = useTranslations('booking.shared')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [redirecting, setRedirecting] = useState(false)

  const eyebrow = isRtl ? payload.modalEyebrowAr : payload.modalEyebrowEn
  const title = isRtl ? payload.titleAr : payload.titleEn
  const cohort = isRtl ? payload.cohortLabelAr : payload.cohortLabelEn

  async function handleContinue() {
    setRedirecting(true)
    try {
      const res = await createBookingCheckoutAction(
        { bookingId: payload.bookingId },
        locale,
      )
      if (!res.ok) {
        // Distinct toast per error code so the user (and devs debugging)
        // can tell apart "Stripe not configured" from "DB unreachable" from
        // "this seat just sold". Defaults to the generic message for
        // unexpected codes. `already_booked` is the server-side defensive
        // check — UI should hide the Reserve button for already-paid
        // bookings, so reaching this branch means a stale client tab.
        // `rate_limited` is the per-user 10-req/min ceiling on this action.
        const errorKey =
          res.error === 'no_capacity'
            ? 'error_no_capacity'
            : res.error === 'not_open'
            ? 'error_not_open'
            : res.error === 'already_booked'
            ? 'error_already_booked'
            : res.error === 'rate_limited'
            ? 'error_rate_limited'
            : res.error === 'stripe_unconfigured'
            ? 'error_stripe_unconfigured'
            : res.error === 'db_unavailable'
            ? 'error_db_unavailable'
            : res.error === 'validation'
            ? 'error_validation'
            : 'error_generic'
        toast.error(tShared(errorKey))
        setRedirecting(false)
        return
      }
      // Successful — redirect to Stripe. showNavLoader for visual continuity.
      showNavLoader(1500)
      window.location.href = res.checkoutUrl
    } catch (err) {
      console.error('[ReserveModal]', err)
      toast.error(tShared('error_generic'))
      setRedirecting(false)
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
            {eyebrow}
          </span>
          <DialogTitle
            className={`text-[clamp(20px,2.4vw,26px)] leading-[1.2] tracking-[-0.01em] [text-wrap:balance] ${
              isRtl
                ? 'font-arabic-display'
                : 'font-arabic-display !tracking-[-0.02em]'
            }`}
          >
            {t('title')}
          </DialogTitle>
          <DialogDescription
            className={isRtl ? 'font-arabic-body' : 'font-display'}
          >
            {t('desc')}
          </DialogDescription>
        </DialogHeader>

        {redirecting ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2
              aria-hidden
              className="h-8 w-8 animate-spin text-[var(--color-accent)]"
            />
            <div className="text-center">
              <h4
                className={`mb-1.5 text-[20px] font-bold text-[var(--color-fg1)] ${
                  isRtl ? 'font-arabic-display' : 'font-arabic-display'
                }`}
              >
                {t('redirecting_title')}
              </h4>
              <p
                className={`text-[14px] text-[var(--color-fg3)] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('redirecting_sub')}
              </p>
            </div>
            <span
              className={`text-[13px] tracking-[0.04em] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {t('stripe_mark')}
            </span>
          </div>
        ) : (
          <>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-[18px]">
              <SummaryRow
                label={t('summary_item')}
                value={title}
                isRtl={isRtl}
              />
              {cohort && (
                <SummaryRow
                  label={t('summary_cohort')}
                  value={cohort}
                  isRtl={isRtl}
                />
              )}
              <div className="my-2 h-px bg-[var(--color-border)]" />
              <div className="flex items-center justify-between gap-3 py-1.5">
                <span
                  className={`text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-fg2)] ${
                    isRtl
                      ? 'font-arabic-body !tracking-normal !normal-case !font-bold'
                      : 'font-display'
                  }`}
                >
                  {t('summary_total')}
                </span>
                <span className="text-[22px] font-bold text-[var(--color-fg1)] [font-feature-settings:'tnum']">
                  ${fmtPrice(payload.priceUsd)}
                </span>
              </div>
            </div>

            <p
              className={`text-[12px] leading-[1.55] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {t('fine_print')}
            </p>

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
                type="button"
                onClick={handleContinue}
                className={`btn-pill btn-pill-primary ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('continue')}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SummaryRow({
  label,
  value,
  isRtl,
}: {
  label: string
  value: string
  isRtl: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-[14px]">
      <span
        className={`text-[var(--color-fg2)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      >
        {label}
      </span>
      <strong
        className={`font-semibold text-[var(--color-fg1)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      >
        {value}
      </strong>
    </div>
  )
}
