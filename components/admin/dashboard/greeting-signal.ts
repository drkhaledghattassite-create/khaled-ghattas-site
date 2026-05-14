// Pure priority-resolution logic for the /admin home greeting band, broken
// out from GreetingBand.tsx so it can be imported by smoke tests without
// dragging in the component's next-intl/server dependency at test time.
//
// Order is load-bearing: the first non-zero / above-threshold condition
// wins, every later condition short-circuits. Revenue moves register only
// when |delta| > 10% so routine noise doesn't crowd out genuine attention
// items. Keep this file dependency-free.

export type GreetingSignalInputs = {
  pendingQuestions: number
  newCorporateRequests: number
  expiringGifts: number
  revenueDeltaPercent: number | null
  pendingBookingInterest: number
}

export type GreetingSignalKind =
  | 'questions'
  | 'corporate'
  | 'gifts'
  | 'revenue_up'
  | 'revenue_down'
  | 'booking_interest'
  | 'all_clear'

export function pickGreetingSignal(c: GreetingSignalInputs): GreetingSignalKind {
  if (c.pendingQuestions > 0) return 'questions'
  if (c.newCorporateRequests > 0) return 'corporate'
  if (c.expiringGifts > 0) return 'gifts'
  if (c.revenueDeltaPercent !== null) {
    if (c.revenueDeltaPercent > 10) return 'revenue_up'
    if (c.revenueDeltaPercent < -10) return 'revenue_down'
  }
  if (c.pendingBookingInterest > 0) return 'booking_interest'
  return 'all_clear'
}
