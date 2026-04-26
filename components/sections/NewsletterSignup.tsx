'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { z } from 'zod'
import { Ornament } from '@/components/shared/Ornament'

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
    await new Promise((r) => setTimeout(r, 400))
    setSubmitting(false)
    setEmail('')
    toast.success(t('subscribed'))
  }

  return (
    <form
      onSubmit={onSubmit}
      className="paper-card-warm relative flex w-full flex-col gap-4 rounded p-7 sm:flex-row sm:items-end sm:gap-6 md:p-9"
    >
      <span aria-hidden className="absolute -top-3 inset-inline-start-7 bg-paper px-2 text-brass">
        <Ornament glyph="fleuron" size={18} />
      </span>

      <div className="flex-1">
        <h3
          className="text-ink font-display font-normal text-[clamp(22px,3vw,32px)] leading-[1.1] tracking-[-0.018em] [dir=rtl]:font-arabic-display [dir=rtl]:font-medium [dir=rtl]:tracking-normal"
        >
          {t('heading')}
        </h3>
        <p
          className="mt-1.5 text-ink-soft font-serif italic text-[14.5px] [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:text-[14px]"
        >
          {t('description')}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="newsletter-email">
          {t('email_label')}
        </label>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('email_placeholder')}
          className="h-11 min-w-[240px] rounded-full border border-ink/35 bg-paper-soft px-5 text-[14px] text-ink placeholder:text-ink-muted focus:border-brass focus:outline-none"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-[10px] min-h-[42px] rounded-full border border-ink bg-ink text-paper-soft text-[13px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] hover:bg-brass-deep hover:border-brass-deep active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold [dir=rtl]:text-[13.5px]"
        >
          <span aria-hidden className="block h-[7px] w-[7px] rounded-full bg-current" />
          {submitting ? t('submitting') : t('subscribe')}
        </button>
      </div>
    </form>
  )
}
