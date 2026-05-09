'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from '@/lib/i18n/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BOOKING_STATES,
  type BookingStateLiteral,
} from '@/lib/validators/booking'
import {
  updateBookingCapacityAction,
  updateBookingStateAction,
} from '@/app/[locale]/(admin)/admin/booking/actions'

type Props = {
  bookingId: string
  title: string
  maxCapacity: number
  bookedCount: number
  activeHoldsCount: number
  bookingState: BookingStateLiteral
}

export function BookingCapacityCard({
  bookingId,
  title,
  maxCapacity,
  bookedCount,
  activeHoldsCount,
  bookingState,
}: Props) {
  const t = useTranslations('admin.booking_booking_form')
  const tBookings = useTranslations('admin.booking_bookings')
  const tCapacity = useTranslations('admin.booking_capacity_modal')
  const tState = useTranslations('admin.booking_state_modal')
  const tActions = useTranslations('admin.booking_actions')
  const tForms = useTranslations('admin.forms')
  const router = useRouter()

  const [capacityOpen, setCapacityOpen] = useState(false)
  const [stateOpen, setStateOpen] = useState(false)
  const [nextCapacity, setNextCapacity] = useState(maxCapacity)
  const [nextState, setNextState] = useState<BookingStateLiteral>(bookingState)
  const [pending, startTransition] = useTransition()

  const committed = bookedCount + activeHoldsCount

  function submitCapacity() {
    startTransition(async () => {
      const result = await updateBookingCapacityAction({
        bookingId,
        maxCapacity: nextCapacity,
      })
      if (!result.ok) {
        if (result.error === 'capacity_below_commitment') {
          const c = result.data.currentBookings + result.data.currentHolds
          toast.error(
            tActions('error_capacity_below_commitment_body', {
              committed: c,
              booked: result.data.currentBookings,
              holds: result.data.currentHolds,
            }),
          )
          return
        }
        toast.error(tActions(`error_${result.error}` as 'error_db_failed'))
        return
      }
      toast.success(tActions('success_capacity_updated'))
      setCapacityOpen(false)
      router.refresh()
    })
  }

  function submitState() {
    startTransition(async () => {
      const result = await updateBookingStateAction({
        bookingId,
        bookingState: nextState,
      })
      if (!result.ok) {
        toast.error(tActions(`error_${result.error}` as 'error_db_failed'))
        return
      }
      toast.success(tActions('success_state_updated'))
      setStateOpen(false)
      router.refresh()
    })
  }

  const stateLabel = (s: BookingStateLiteral) =>
    s === 'OPEN'
      ? t('booking_state_open')
      : s === 'CLOSED'
      ? t('booking_state_closed')
      : t('booking_state_sold_out')

  // Show the revert warning when the user is moving from SOLD_OUT to OPEN.
  const showRevertWarning =
    bookingState === 'SOLD_OUT' && nextState === 'OPEN'

  return (
    <section className="rounded-md border border-border bg-bg-elevated p-5 space-y-4">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-[14px] font-display font-semibold text-fg1">
          {t('section_capacity')}
        </h2>
        <span className="num-latn text-[11px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
          {tCapacity('current_value', {
            booked: bookedCount,
            holds: activeHoldsCount,
            committed,
          })}
        </span>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={tCapacity('stat_max')} value={maxCapacity} />
        <Stat label={tCapacity('stat_booked')} value={bookedCount} />
        <Stat label={tCapacity('stat_holds')} value={activeHoldsCount} />
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          onClick={() => {
            setNextCapacity(maxCapacity)
            setCapacityOpen(true)
          }}
          className="rounded-full border border-border px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-fg1 font-display font-semibold hover:bg-bg-deep transition-colors"
        >
          {tBookings('edit_capacity')}
        </button>
        <button
          type="button"
          onClick={() => {
            setNextState(bookingState)
            setStateOpen(true)
          }}
          className="rounded-full border border-border px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-fg1 font-display font-semibold hover:bg-bg-deep transition-colors"
        >
          {tBookings('edit_state')}
        </button>
      </div>

      {/* Capacity dialog */}
      <AlertDialog
        open={capacityOpen}
        onOpenChange={(open) => !pending && setCapacityOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCapacity('title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tCapacity('description', { title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-bg-deep p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
                {tCapacity('current_label')}
              </p>
              <p className="text-[13px] text-fg1 num-latn pt-1">
                {tCapacity('current_value', {
                  booked: bookedCount,
                  holds: activeHoldsCount,
                  committed,
                })}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cap-input">{tCapacity('max_capacity')}</Label>
              <Input
                id="cap-input"
                type="number"
                min={1}
                inputMode="numeric"
                value={nextCapacity}
                onChange={(e) => setNextCapacity(Number(e.target.value))}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {tCapacity('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={submitCapacity}
              disabled={pending}
            >
              {pending ? tForms('saving') : tCapacity('save')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* State dialog */}
      <AlertDialog
        open={stateOpen}
        onOpenChange={(open) => !pending && setStateOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tState('title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tState('description', { title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-bg-deep p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
                {tState('current_label')}
              </p>
              <p className="text-[13px] text-fg1 pt-1">
                {stateLabel(bookingState)}
              </p>
            </div>
            <fieldset
              className="space-y-2"
              role="radiogroup"
              aria-label={t('booking_state')}
            >
              {BOOKING_STATES.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-3 rounded-md border border-border bg-bg-elevated px-3 py-2 cursor-pointer hover:bg-bg-deep transition-colors"
                >
                  <input
                    type="radio"
                    name="booking-state"
                    value={s}
                    checked={nextState === s}
                    onChange={() => setNextState(s)}
                    className="accent-accent"
                  />
                  <span className="text-[13px] text-fg1">{stateLabel(s)}</span>
                </label>
              ))}
            </fieldset>
            {showRevertWarning && (
              <p className="rounded-md border border-warning bg-warning-soft px-3 py-2 text-[12px] text-warning">
                {tState('revert_warning')}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {tState('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={submitState}
              disabled={pending}
            >
              {pending ? tForms('saving') : tState('save')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-bg-deep p-4">
      <p className="text-[10px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
        {label}
      </p>
      <p className="num-latn text-[28px] leading-none font-display font-semibold text-fg1 pt-1">
        {value}
      </p>
    </div>
  )
}
