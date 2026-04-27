'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link, useRouter } from '@/lib/i18n/navigation'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function LoginForm() {
  const t = useTranslations('auth.login')
  const locale = useLocale()
  const router = useRouter()
  const isRtl = locale === 'ar'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Mock auth — Phase 4B will wire Better Auth.
    await new Promise((r) => setTimeout(r, 600))
    setLoading(false)
    router.push('/dashboard')
  }

  return (
    <motion.div
      dir={isRtl ? 'rtl' : 'ltr'}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex flex-col"
    >
      <span
        className={`mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)] ${
          isRtl ? 'font-arabic-body !text-[14px] !tracking-normal !normal-case !font-bold' : 'font-display'
        }`}
      >
        {t('eyebrow')}
      </span>
      <h1
        className={`m-0 text-[clamp(28px,3.6vw,40px)] leading-[1.1] font-bold tracking-[-0.02em] text-[var(--color-fg1)] ${
          isRtl ? 'font-arabic-display' : 'font-arabic-display'
        }`}
      >
        {t('heading')}
      </h1>
      <p
        className={`m-0 mt-3 text-[16px] leading-[1.55] text-[var(--color-fg2)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      >
        {t('subheading')}
      </p>

      <form onSubmit={handleSubmit} className="mt-9 flex flex-col gap-5" noValidate>
        <Field
          id="email"
          type="email"
          label={t('email_label')}
          placeholder={t('email_placeholder')}
          value={email}
          onChange={setEmail}
          isRtl={isRtl}
          required
          autoComplete="email"
        />
        <Field
          id="password"
          type="password"
          label={t('password_label')}
          placeholder={t('password_placeholder')}
          value={password}
          onChange={setPassword}
          isRtl={isRtl}
          required
          autoComplete="current-password"
          trailingLink={{ label: t('forgot'), href: '/login' }}
        />

        <label
          className={`inline-flex items-center gap-2.5 text-[13px] text-[var(--color-fg2)] cursor-pointer select-none ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-accent)] cursor-pointer"
          />
          {t('remember')}
        </label>

        <button
          type="submit"
          disabled={loading}
          className="btn-pill btn-pill-primary w-full mt-2 !py-3.5 !px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('submitting') : t('submit')}
        </button>
      </form>

      {/* Divider */}
      <div className="my-7 flex items-center gap-4">
        <span aria-hidden className="block flex-1 h-px bg-[var(--color-border)]" />
        <span
          className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] ${
            isRtl ? 'font-arabic-body !tracking-normal !normal-case !text-[13px] !font-bold' : 'font-display'
          }`}
        >
          {t('or')}
        </span>
        <span aria-hidden className="block flex-1 h-px bg-[var(--color-border)]" />
      </div>

      {/* OAuth — full-width secondary */}
      <button
        type="button"
        className={`btn-pill btn-pill-secondary w-full inline-flex items-center justify-center gap-3 !py-3 ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      >
        <GoogleGlyph />
        {t('google')}
      </button>

      {/* Footer link — center-aligned per design */}
      <p
        className={`mt-8 text-center text-[14px] text-[var(--color-fg2)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      >
        {t('no_account')}{' '}
        <Link
          href="/register"
          className="link-underline !text-[var(--color-fg1)] hover:!text-[var(--color-accent)]"
        >
          {t('create_account')}
        </Link>
      </p>
    </motion.div>
  )
}

type FieldProps = {
  id: string
  type: 'email' | 'password' | 'text'
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  isRtl: boolean
  required?: boolean
  autoComplete?: string
  trailingLink?: { label: string; href: string }
}

function Field({
  id,
  type,
  label,
  placeholder,
  value,
  onChange,
  isRtl,
  required,
  autoComplete,
  trailingLink,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className={`text-[13px] font-semibold text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {label}
        </label>
        {trailingLink && (
          <Link
            href={trailingLink.href}
            className={`text-[12px] text-[var(--color-fg3)] hover:text-[var(--color-accent)] transition-colors ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {trailingLink.label}
          </Link>
        )}
      </div>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={`w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[15px] text-[var(--color-fg1)] placeholder:text-[var(--color-fg3)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--color-accent)] focus:[box-shadow:var(--shadow-focus)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      />
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09 0-.73.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}
