'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

export function NewsletterForm() {
  const t = useTranslations('newsletter')
  const locale = useLocale()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  // QA P1 — inline error state for screen-reader users. Sonner toasts alone
  // don't satisfy WCAG 3.3.1 (Error Identification) because they're
  // transient and not associated with the input via aria-describedby.
  // Mirrors the LoginForm error pattern.
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, locale, source: 'newsletter-form' }),
      })
      if (res.ok) {
        toast.success(t('subscribed'))
        setDone(true)
        setEmail('')
        return
      }
      if (res.status === 429) {
        setError(t('rate_limited'))
        toast.error(t('rate_limited'))
        return
      }
      setError(t('invalid_email'))
      toast.error(t('invalid_email'))
    } catch (err) {
      console.error('[NewsletterForm]', err)
      setError(t('invalid_email'))
      toast.error(t('invalid_email'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <p className="text-sm text-fg2">{t('success_message')}</p>
    )
  }

  const errorId = 'newsletter-error'
  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-3">
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          {t('email_label')}
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('email_placeholder')}
          aria-invalid={error != null}
          aria-describedby={error ? errorId : undefined}
          className="h-12 flex-1 rounded-md border border-border bg-bg-elevated px-3 text-[15px] text-fg1 placeholder:text-fg3/70 focus-visible:border-accent focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="btn-pill btn-pill-primary disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? t('submitting') : t('submit')}
        </button>
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-[var(--color-destructive)]"
        >
          {error}
        </p>
      )}
    </form>
  )
}
