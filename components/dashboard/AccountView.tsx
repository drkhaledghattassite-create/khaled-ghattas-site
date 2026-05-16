'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Loader2, ShieldAlert } from 'lucide-react'
import type { ServerSessionUser } from '@/lib/auth/server'
import { authClient } from '@/lib/auth/client'
import { resendVerificationAction } from '@/app/[locale]/(auth)/actions'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function AccountView({
  user,
  initialBio,
}: {
  user: ServerSessionUser
  initialBio?: string | null
}) {
  const t = useTranslations('dashboard.account')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  const [name, setName] = useState(user.name)
  // Email is read-only (Phase H B-3). Changes flow through support so the
  // new address can be re-verified. Kept as state only so the field can
  // render the user's current address.
  const email = user.email
  const [bio, setBio] = useState(
    initialBio ??
      (isRtl
        ? 'قارئ شغوف بالفلسفة والأدب والعلوم السلوكية.'
        : 'A reader passionate about philosophy, literature, and behavioral science.'),
  )
  const [saving, setSaving] = useState(false)
  const [resending, startResend] = useTransition()

  // Phase H Item 4 — resend the verification email through the
  // rate-limited server-action wrapper. Surfacing rate_limited as a
  // distinct toast (rather than the generic "send failed") so a user
  // who tapped twice in a row gets clear feedback.
  function handleResendVerification() {
    startResend(async () => {
      const result = await resendVerificationAction({ email })
      if (result.ok) {
        toast.success(t('verification_resent'))
        return
      }
      if (result.error === 'rate_limited') {
        toast.error(t('verification_rate_limited'))
        return
      }
      toast.error(t('verification_resend_failed'))
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      // Update name via Better Auth (no-op in mock mode). Email is read-only;
      // see lib/auth/index.ts emailVerification block for the rationale.
      if (name !== user.name) {
        try {
          await authClient.updateUser({ name })
        } catch (err) {
          console.warn('[AccountView] updateUser:', err)
        }
      }
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, bio }),
      })
      if (!res.ok) {
        if (res.status === 401) {
          toast.error(isRtl ? 'يلزم تسجيل الدخول.' : 'Sign in required.')
          return
        }
        throw new Error(`HTTP ${res.status}`)
      }
      toast.success(t('saved'))
    } catch (err) {
      console.error('[AccountView]', err)
      toast.error(isRtl ? 'تعذر الحفظ.' : 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex flex-col gap-[clamp(28px,3.5vw,44px)]"
    >
      {/* Phase H Item 4 — verification banner. Persistent (not dismissible)
          because this is a security signal, not a notification. role="status"
          + aria-live="polite" so screen readers announce the warning state
          without interrupting other speech. Hidden entirely when the user
          is verified — no DOM cost in the common case. */}
      {!user.emailVerified && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--color-accent)]"
              aria-hidden
            />
            <div className="flex flex-col gap-1">
              <p
                className={`m-0 text-[14px] font-semibold leading-[1.4] text-[var(--color-accent-hover)] ${
                  isRtl ? 'font-arabic-body !text-[15px]' : 'font-display'
                }`}
              >
                {t('verification_pending_title')}
              </p>
              <p
                className={`m-0 text-[13px] leading-[1.55] text-[var(--color-fg2)] ${
                  isRtl ? 'font-arabic-body !text-[14px]' : 'font-display'
                }`}
              >
                {t('verification_pending_body', { email })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resending}
            className={`btn-pill btn-pill-secondary inline-flex items-center justify-center gap-2 !text-[13px] !py-2 !px-4 self-start sm:self-auto disabled:opacity-60 disabled:cursor-not-allowed ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {resending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            )}
            {resending
              ? t('verification_resending')
              : t('verification_resend_cta')}
          </button>
        </div>
      )}

      {/* Section heading */}
      <header className="flex flex-col gap-2">
        <h2
          className={`m-0 text-[clamp(22px,2.5vw,28px)] leading-[1.2] font-bold tracking-[-0.005em] text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.015em]'
          }`}
        >
          {t('section_title')}
        </h2>
        <p
          className={`m-0 max-w-[60ch] text-[14px] leading-[1.55] text-[var(--color-fg3)] ${
            isRtl ? 'font-arabic-body !text-[15px] !leading-[1.7]' : 'font-display'
          }`}
        >
          {t('section_subtitle')}
        </p>
      </header>

      {/* Editable form — design qh-profile-grid: 2 cols on desktop, 1 on mobile, bio spans full */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[720px]"
        noValidate
      >
        <Field
          id="name"
          label={t('name')}
          value={name}
          onChange={setName}
          isRtl={isRtl}
          required
          autoComplete="name"
        />
        <ReadOnlyField
          id="email"
          type="email"
          label={t('email')}
          value={email}
          hint={t('email_readonly_note')}
          isRtl={isRtl}
        />
        <FieldArea
          id="bio"
          label={t('bio')}
          value={bio}
          onChange={setBio}
          rows={3}
          isRtl={isRtl}
          className="md:col-span-2"
        />

        <div className="md:col-span-2 flex flex-wrap gap-3 mt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-pill btn-pill-primary !px-7 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </motion.section>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  isRtl,
  required,
  autoComplete,
  className = '',
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'email'
  isRtl: boolean
  required?: boolean
  autoComplete?: string
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label
        htmlFor={id}
        className={`text-[12px] font-semibold tracking-[0.04em] text-[var(--color-fg2)] ${
          isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !font-bold' : 'font-display'
        }`}
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        className={`w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[15px] text-[var(--color-fg1)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--color-accent)] focus:[box-shadow:var(--shadow-focus)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      />
    </div>
  )
}

// Read-only variant of `Field`. Used by the email row in this view:
// the value is displayed disabled-styled, with a small hint underneath
// pointing the user to support for changes (which routes the request
// through a re-verification flow). See Phase H blocker B-3.
function ReadOnlyField({
  id,
  label,
  value,
  hint,
  type = 'text',
  isRtl,
  className = '',
}: {
  id: string
  label: string
  value: string
  hint: string
  type?: 'text' | 'email'
  isRtl: boolean
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label
        htmlFor={id}
        className={`text-[12px] font-semibold tracking-[0.04em] text-[var(--color-fg2)] ${
          isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !font-bold' : 'font-display'
        }`}
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        readOnly
        aria-readonly="true"
        tabIndex={-1}
        className={`w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-deep)] text-[15px] text-[var(--color-fg2)] outline-none cursor-not-allowed ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      />
      <p
        className={`m-0 text-[12.5px] leading-[1.5] text-[var(--color-fg3)] ${
          isRtl ? 'font-arabic-body !text-[13px]' : 'font-display'
        }`}
      >
        {hint}
      </p>
    </div>
  )
}

function FieldArea({
  id,
  label,
  value,
  onChange,
  rows = 3,
  isRtl,
  className = '',
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  isRtl: boolean
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label
        htmlFor={id}
        className={`text-[12px] font-semibold tracking-[0.04em] text-[var(--color-fg2)] ${
          isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !font-bold' : 'font-display'
        }`}
      >
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[15px] leading-[1.6] text-[var(--color-fg1)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--color-accent)] focus:[box-shadow:var(--shadow-focus)] resize-y min-h-[96px] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      />
    </div>
  )
}

