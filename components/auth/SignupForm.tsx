'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link, useRouter } from '@/lib/i18n/navigation'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function SignupForm() {
  const t = useTranslations('auth.signup')
  const locale = useLocale()
  const router = useRouter()
  const isRtl = locale === 'ar'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) return
    setLoading(true)
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
          id="name"
          type="text"
          label={t('name_label')}
          placeholder={t('name_placeholder')}
          value={name}
          onChange={setName}
          isRtl={isRtl}
          required
          autoComplete="name"
        />
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
          autoComplete="new-password"
        />

        <label
          className={`inline-flex items-start gap-2.5 text-[13px] leading-[1.5] text-[var(--color-fg2)] cursor-pointer select-none ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-4 w-4 mt-0.5 accent-[var(--color-accent)] cursor-pointer flex-shrink-0"
            required
          />
          <span>{t('agree_terms')}</span>
        </label>

        <button
          type="submit"
          disabled={loading || !agreed}
          className="btn-pill btn-pill-primary w-full mt-2 !py-3.5 !px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('submitting') : t('submit')}
        </button>
      </form>

      <p
        className={`mt-8 text-center text-[14px] text-[var(--color-fg2)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      >
        {t('have_account')}{' '}
        <Link
          href="/login"
          className="link-underline !text-[var(--color-fg1)] hover:!text-[var(--color-accent)]"
        >
          {t('sign_in')}
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
}: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={`text-[13px] font-semibold text-[var(--color-fg1)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
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
