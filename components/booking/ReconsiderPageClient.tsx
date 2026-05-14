'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import type { BookingWithHolds } from '@/lib/db/queries'
import { AuthRequiredDialog } from '@/components/auth/AuthRequiredDialog'
import { ReconsiderSection } from './ReconsiderSection'
import { ReserveModal } from './ReserveModal'
import { InterestModal } from './InterestModal'

type ReservePayload = {
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

type InterestPayload = {
  bookingId: string
  titleAr: string
  titleEn: string
  mode: 'sold_out' | 'closed'
}

type ModalState =
  | { kind: 'reserve'; payload: ReservePayload }
  | { kind: 'interest'; payload: InterestPayload }
  | null

type Props = {
  reconsider: BookingWithHolds
  hasSession: boolean
  isAlreadyBooked: boolean
  allowGifting: boolean
}

/**
 * Client wrapper for /booking/reconsider.
 *
 * Owns reserve/interest modal state, auth-gated CTA opener, and the
 * focus-tab refresh-on-return throttle (so stale hold counts get
 * refreshed when the user returns from a Stripe redirect tab).
 */
export function ReconsiderPageClient({
  reconsider,
  hasSession,
  isAlreadyBooked,
  allowGifting,
}: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalState>(null)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const closeModal = useCallback(() => setModal(null), [])

  // Refresh server data when the user returns to the tab. Two flows benefit:
  //   - User clicks Reserve → opens Stripe in a new tab → comes back without
  //     paying (their own hold is now 1, but their stale view shows it as 0).
  //   - Two windows open and the other one just confirmed a booking.
  // Throttled to once per 30 seconds via a ref-stored timestamp so a user
  // toggling tabs rapidly doesn't hammer the DB.
  const lastRefreshAt = useRef(0)
  useEffect(() => {
    function onFocus() {
      const now = Date.now()
      if (now - lastRefreshAt.current < 30_000) return
      lastRefreshAt.current = now
      router.refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [router])

  const openIfAuthed = useCallback(
    (next: ModalState) => {
      if (!hasSession) {
        setAuthPromptOpen(true)
        return
      }
      setModal(next)
    },
    [hasSession],
  )

  const onReserve = useCallback(() => {
    // Defensive belt-and-braces: the Reserve button is hidden when the user
    // already paid, but if a stale client triggers this anyway, no-op
    // instead of opening Stripe. The server action also rejects.
    if (isAlreadyBooked) return
    openIfAuthed({
      kind: 'reserve',
      payload: {
        bookingId: reconsider.id,
        titleAr: reconsider.titleAr,
        titleEn: reconsider.titleEn,
        cohortLabelAr: reconsider.cohortLabelAr,
        cohortLabelEn: reconsider.cohortLabelEn,
        priceUsd: reconsider.priceUsd,
        currency: reconsider.currency,
        modalEyebrowAr: 'دورة Reconsider',
        modalEyebrowEn: 'Reconsider course',
      },
    })
  }, [reconsider, openIfAuthed, isAlreadyBooked])

  const onInterest = useCallback(
    (mode: 'sold_out' | 'closed') => {
      openIfAuthed({
        kind: 'interest',
        payload: {
          bookingId: reconsider.id,
          titleAr: reconsider.titleAr,
          titleEn: reconsider.titleEn,
          mode,
        },
      })
    },
    [reconsider, openIfAuthed],
  )

  return (
    <>
      <ReconsiderSection
        reconsider={reconsider}
        onReserve={onReserve}
        onInterest={onInterest}
        isAlreadyBooked={isAlreadyBooked}
        allowGifting={allowGifting}
      />
      {modal?.kind === 'reserve' && (
        <ReserveModal payload={modal.payload} onClose={closeModal} />
      )}
      {modal?.kind === 'interest' && (
        <InterestModal payload={modal.payload} onClose={closeModal} />
      )}
      <AuthRequiredDialog
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        redirectTo="/booking/reconsider"
      />
    </>
  )
}
