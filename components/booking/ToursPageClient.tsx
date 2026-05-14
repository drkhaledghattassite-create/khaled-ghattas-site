'use client'

import { useCallback, useState } from 'react'
import type { Tour } from '@/lib/db/queries'
import { AuthRequiredDialog } from '@/components/auth/AuthRequiredDialog'
import { ToursSection } from './ToursSection'
import { SuggestCityModal } from './SuggestCityModal'

type Props = {
  tours: Tour[]
  pastTours: Tour[]
  hasSession: boolean
}

/**
 * Client wrapper for /booking/tours.
 *
 * Owns:
 *   - Suggest-city modal state
 *   - Auth-required dialog (logged-out users tapping suggest)
 *
 * Reads tours + pastTours from the server page. Pre-split this lived in
 * the monolithic BookingPage; the per-route split moves modal state to
 * each section's page so context (Reserve / Interest / Suggest) doesn't
 * cross-contaminate.
 */
export function ToursPageClient({ tours, pastTours, hasSession }: Props) {
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)

  const onSuggest = useCallback(() => {
    if (!hasSession) {
      setAuthPromptOpen(true)
      return
    }
    setSuggestOpen(true)
  }, [hasSession])

  return (
    <>
      <ToursSection tours={tours} pastTours={pastTours} onSuggest={onSuggest} />
      {suggestOpen && <SuggestCityModal onClose={() => setSuggestOpen(false)} />}
      <AuthRequiredDialog
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        redirectTo="/booking/tours"
      />
    </>
  )
}
