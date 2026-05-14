import { permanentRedirect } from 'next/navigation'

type Props = { params: Promise<{ locale: string }> }

// /booking is a redirect target for legacy links. The booking surface is
// split into three SEO-distinct routes (/booking/tours, /booking/reconsider,
// /booking/sessions). 308 keeps inbound link equity flowing to the new URL.
//
// The `?from=legacy-booking` marker lets the target page fire a one-off
// analytics event so we can measure how many users still hit the legacy
// URL after the split. `LegacyRedirectTracker` strips the param client-side
// after firing, so the user's address bar stays clean and search engines
// see the canonical /booking/tours URL.
export default async function BookingRoute({ params }: Props) {
  const { locale } = await params
  permanentRedirect(
    locale === 'en'
      ? '/en/booking/tours?from=legacy-booking'
      : '/booking/tours?from=legacy-booking',
  )
}
