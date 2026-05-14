'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import type { BookingWithHolds } from '@/lib/db/queries'
import { AuthRequiredDialog } from '@/components/auth/AuthRequiredDialog'
import { SessionsSection } from './SessionsSection'
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
  sessions: BookingWithHolds[]
  hasSession: boolean
  paidBookingIds: string[]
  allowGifting: boolean
}

export function SessionsPageClient({
  sessions,
  hasSession,
  paidBookingIds,
  allowGifting,
}: Props) {
  const router = useRouter()
  const paidBookingIdSet = useMemo(
    () => new Set(paidBookingIds),
    [paidBookingIds],
  )
  const [modal, setModal] = useState<ModalState>(null)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const closeModal = useCallback(() => setModal(null), [])

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

  const onReserve = useCallback(
    (s: BookingWithHolds) => {
      if (paidBookingIdSet.has(s.id)) return
      openIfAuthed({
        kind: 'reserve',
        payload: {
          bookingId: s.id,
          titleAr: s.titleAr,
          titleEn: s.titleEn,
          cohortLabelAr: s.cohortLabelAr,
          cohortLabelEn: s.cohortLabelEn,
          priceUsd: s.priceUsd,
          currency: s.currency,
          modalEyebrowAr: s.titleAr,
          modalEyebrowEn: s.titleEn,
        },
      })
    },
    [openIfAuthed, paidBookingIdSet],
  )

  const onInterest = useCallback(
    (s: BookingWithHolds, mode: 'sold_out' | 'closed') => {
      openIfAuthed({
        kind: 'interest',
        payload: {
          bookingId: s.id,
          titleAr: s.titleAr,
          titleEn: s.titleEn,
          mode,
        },
      })
    },
    [openIfAuthed],
  )

  return (
    <>
      <SessionsSection
        sessions={sessions}
        onReserve={onReserve}
        onInterest={onInterest}
        paidBookingIds={paidBookingIdSet}
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
        redirectTo="/booking/sessions"
      />
    </>
  )
}
