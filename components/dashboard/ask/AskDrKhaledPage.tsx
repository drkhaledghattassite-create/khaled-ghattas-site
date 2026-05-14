'use client'

/**
 * Phase B1 — orchestrator for /dashboard/ask.
 *
 * Owns the question list (server-fetched + optimistic-updated on submit) +
 * the form/success toggle. Hero + guide are layout siblings; the form-list
 * relationship is the only stateful coupling on the page.
 *
 * Layout follows the design's two-column form grid (form on the
 * leading edge, sticky guide on the trailing) on desktop, single column on
 * mobile. The history list spans the full width below.
 */

import { useState, useCallback } from 'react'
import { motion } from 'motion/react'
import { fadeUp, EASE_EDITORIAL } from '@/lib/motion/variants'
import { AskHero } from './AskHero'
import { AskGuide } from './AskGuide'
import { QuestionForm } from './QuestionForm'
import { SubmitSuccessCard } from './SubmitSuccessCard'
import { QuestionList } from './QuestionList'
import type { QuestionStatus } from '@/lib/db/schema'

export type ClientUserQuestion = {
  id: string
  subject: string
  body: string
  category: string | null
  status: QuestionStatus
  /** The prose answer Dr. Khaled wrote in the admin queue. Null when not
   *  answered yet, or when answered before this field existed. */
  answerBody: string | null
  answerReference: string | null
  answeredAt: string | null
  createdAt: string
}

type Props = {
  locale: 'ar' | 'en'
  initialItems: ClientUserQuestion[]
  userFirstName: string
}

export function AskDrKhaledPage({ locale, initialItems, userFirstName }: Props) {
  // Two-mode form: 'editing' (the form is shown) or 'submitted' (success card
  // is shown until the user clicks "Ask another"). The submitted item is
  // optimistically prepended to the list so the user sees their question
  // immediately, even before the server-fetch round-trips.
  const [items, setItems] = useState<ClientUserQuestion[]>(initialItems)
  const [mode, setMode] = useState<'editing' | 'submitted'>('editing')

  const handleSubmitted = useCallback((q: ClientUserQuestion) => {
    setItems((prev) => [q, ...prev])
    setMode('submitted')
  }, [])

  const handleAskAnother = useCallback(() => {
    setMode('editing')
  }, [])

  const handleViewList = useCallback(() => {
    setMode('editing')
    // Smooth-scroll to the history list. The element id is set on
    // QuestionList's wrapper.
    if (typeof document !== 'undefined') {
      document
        .getElementById('ask-history')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
      className="flex flex-col"
    >
      <AskHero locale={locale} userFirstName={userFirstName} />

      <div className="grid grid-cols-1 gap-[clamp(32px,5vw,64px)] items-start lg:[grid-template-columns:minmax(0,1.2fr)_minmax(0,1fr)]">
        {mode === 'editing' ? (
          <QuestionForm locale={locale} onSubmitted={handleSubmitted} />
        ) : (
          <SubmitSuccessCard
            locale={locale}
            onAskAnother={handleAskAnother}
            onViewList={handleViewList}
          />
        )}
        <div className="flex flex-col gap-5 lg:sticky lg:top-[120px]">
          <AskGuide locale={locale} />
        </div>
      </div>

      <QuestionList locale={locale} items={items} />
    </motion.div>
  )
}
