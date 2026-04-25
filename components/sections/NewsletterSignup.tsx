'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { z } from 'zod'

const schema = z.object({ email: z.string().email() })

export function NewsletterSignup() {
  const t = useTranslations('newsletter')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = schema.safeParse({ email })
    if (!parsed.success) {
      toast.error(t('invalid_email'))
      return
    }
    setSubmitting(true)
    // TODO: wire to /api/newsletter when backend is live
    await new Promise((r) => setTimeout(r, 400))
    setSubmitting(false)
    setEmail('')
    toast.success(t('subscribed'))
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-3 rounded-lg border border-dashed border-ink bg-cream-soft p-6 sm:flex-row sm:items-center"
    >
      <div className="flex-1">
        <h3
          className="text-[18px] uppercase text-ink"
          style={{
            fontFamily: 'var(--font-oswald)',
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          {t('heading')}
        </h3>
        <p className="mt-1 text-[13px] text-ink-muted">{t('description')}</p>
      </div>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="newsletter-email">
          {t('email_label')}
        </label>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('email_placeholder')}
          className="h-10 min-w-[220px] rounded-full border border-dashed border-ink bg-transparent px-4 text-[13px] text-ink placeholder:text-ink-muted focus:outline-none"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="font-label inline-flex items-center gap-2 rounded-full border border-dashed border-ink bg-ink px-4 py-2 text-[12px] text-cream-soft transition-colors duration-300 hover:bg-transparent hover:text-ink disabled:opacity-60"
          style={{ letterSpacing: '0.08em' }}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cream-soft" />
          {submitting ? t('submitting') : t('subscribe')}
        </button>
      </div>
    </form>
  )
}
