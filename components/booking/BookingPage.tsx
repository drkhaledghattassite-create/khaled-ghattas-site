'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from '@/lib/i18n/navigation'
import type { BookingWithHolds, Tour } from '@/lib/db/queries'
import { AuthRequiredDialog } from '@/components/auth/AuthRequiredDialog'
import { BookingPageHeader } from './BookingPageHeader'
import { BookingSubNav } from './BookingSubNav'
import { ToursSection } from './ToursSection'
import { ReconsiderSection } from './ReconsiderSection'
import { SessionsSection } from './SessionsSection'
import { ReserveModal } from './ReserveModal'
import { SuggestCityModal } from './SuggestCityModal'
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
  | { kind: 'suggest' }
  | { kind: 'interest'; payload: InterestPayload }
  | null

type Props = {
  tours: Tour[]
  pastTours: Tour[]
  reconsider: BookingWithHolds | null
  sessions: BookingWithHolds[]
  hasSession: boolean
  /**
   * Bookings the current user already has a PAID/FULFILLED order for.
   * The Reconsider panel + each Sessions card swap their Reserve CTA for
   * an "already booked → view in dashboard" link when their id is here.
   * Source of truth lives server-side; the action layer also defends.
   * Empty array for logged-out visitors.
   */
  paidBookingIds: string[]
}

const SECTION_IDS = ['tours', 'reconsider', 'sessions'] as const
type SectionId = (typeof SECTION_IDS)[number]

// SiteHeader (60px) + sub-nav sticky top (68px) + sub-nav height (~50px)
// + a small breathing buffer. Used by scroll-spy threshold checks and
// programmatic jumps so a tapped chip lands the section header just
// below the sticky sub-bar instead of underneath it.
const SCROLL_OFFSET = 130

function effectiveRemaining(b: BookingWithHolds): number {
  return Math.max(0, b.maxCapacity - b.bookedCount - b.activeHoldsCount)
}

function deriveState(b: BookingWithHolds): 'open' | 'sold_out' | 'closed' {
  if (b.bookingState === 'CLOSED') return 'closed'
  if (b.bookingState === 'SOLD_OUT') return 'sold_out'
  // OPEN — auto-detect sold-out when capacity exhausted including holds.
  return effectiveRemaining(b) === 0 ? 'sold_out' : 'open'
}

export function BookingPage({
  tours,
  pastTours,
  reconsider,
  sessions,
  hasSession,
  paidBookingIds,
}: Props) {
  // Set lookup beats Array.includes in two-place lookup paths (handler
  // closures + render); cheap to construct once.
  const paidBookingIdSet = useMemo(
    () => new Set(paidBookingIds),
    [paidBookingIds],
  )
  const locale = useLocale()
  const router = useRouter()
  const isRtl = locale === 'ar'

  const [modal, setModal] = useState<ModalState>(null)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [active, setActive] = useState<SectionId>('tours')

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

  // Sub-nav scroll-spy. Listens to scroll, picks the section whose offsetTop
  // is closest above the viewport plus SCROLL_OFFSET (matches the sticky bar
  // height + a bit of breathing room).
  useEffect(() => {
    function onScroll() {
      const y = window.scrollY + SCROLL_OFFSET + 60
      let cur: SectionId = 'tours'
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= y) cur = id
      }
      setActive(cur)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const jump = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET
    window.scrollTo({ top: y, behavior: 'smooth' })
  }, [])

  // Auth-gated modal opener. Logged-out users get the AuthRequiredDialog
  // instead — the dialog kicks them to /login?redirect=/booking and
  // bounces them back after authentication.
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

  // Status-strip + sub-nav metrics. Memoised so we don't recompute on every
  // render of the orchestrator.
  const metrics = useMemo(() => {
    const sessionsOpen = sessions.filter((s) => deriveState(s) === 'open').length
    const reconsiderState = reconsider ? deriveState(reconsider) : null
    return {
      toursOpen: tours.length,
      sessionsOpen,
      reconsiderState,
      reconsiderHasOpen: reconsiderState === 'open',
      sessionsCount: sessions.length,
    }
  }, [tours, sessions, reconsider])

  // Reconsider handlers
  const onReconsiderReserve = useCallback(() => {
    if (!reconsider) return
    // Defensive belt-and-braces: the Reserve button is hidden when the user
    // already paid, but if a stale client triggers this anyway, no-op
    // instead of opening Stripe. The server action also rejects.
    if (paidBookingIdSet.has(reconsider.id)) return
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
  }, [reconsider, openIfAuthed, paidBookingIdSet])

  const onReconsiderInterest = useCallback(
    (mode: 'sold_out' | 'closed') => {
      if (!reconsider) return
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

  // Session card handlers
  const onSessionReserve = useCallback(
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

  const onSessionInterest = useCallback(
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

  const onSuggest = useCallback(() => {
    openIfAuthed({ kind: 'suggest' })
  }, [openIfAuthed])

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="bg-[var(--color-bg)]">
      <BookingPageHeader
        toursOpen={metrics.toursOpen}
        sessionsOpen={metrics.sessionsOpen}
        reconsiderState={metrics.reconsiderState}
        reconsiderCohortLabel={
          reconsider
            ? isRtl
              ? reconsider.cohortLabelAr
              : reconsider.cohortLabelEn
            : null
        }
      />
      <BookingSubNav
        active={active}
        onJump={jump}
        toursOpen={metrics.toursOpen}
        reconsiderHasOpen={metrics.reconsiderHasOpen}
        sessionsOpen={metrics.sessionsOpen}
      />

      <main>
        <ToursSection
          tours={tours}
          pastTours={pastTours}
          onSuggest={onSuggest}
        />

        {reconsider && (
          <ReconsiderSection
            reconsider={reconsider}
            onReserve={onReconsiderReserve}
            onInterest={onReconsiderInterest}
            // Drives the mobile sticky-bottom Reserve CTA — only visible
            // while the user is actually scrolled within the Reconsider
            // section, so the bar doesn't pollute Tours / Sessions context.
            isInView={active === 'reconsider'}
            isAlreadyBooked={paidBookingIdSet.has(reconsider.id)}
          />
        )}

        {sessions.length > 0 && (
          <SessionsSection
            sessions={sessions}
            onReserve={onSessionReserve}
            onInterest={onSessionInterest}
            paidBookingIds={paidBookingIdSet}
          />
        )}
      </main>

      {modal?.kind === 'reserve' && (
        <ReserveModal payload={modal.payload} onClose={closeModal} />
      )}
      {modal?.kind === 'suggest' && <SuggestCityModal onClose={closeModal} />}
      {modal?.kind === 'interest' && (
        <InterestModal payload={modal.payload} onClose={closeModal} />
      )}

      <AuthRequiredDialog
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        redirectTo="/booking"
      />
    </div>
  )
}
