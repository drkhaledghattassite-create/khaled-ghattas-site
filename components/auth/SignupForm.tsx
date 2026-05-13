'use client'

import { forwardRef, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Link, useRouter } from '@/lib/i18n/navigation'
import { authClient } from '@/lib/auth/client'
import { safeRedirect, withRedirect } from '@/lib/auth/redirect'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Errors = {
  name?: string
  email?: string
  password?: string
  agreed?: string
}

export function SignupForm() {
  const t = useTranslations('auth.signup')
  const tErr = useTranslations('auth.errors')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRtl = locale === 'ar'
  const redirectTarget = safeRedirect(searchParams.get('redirect'))
  // Pre-fill the email field when the user arrived from a flow that knows it
  // (e.g. /gifts/claim?token=… → /register?redirect=…&email=…). The field
  // stays editable — a user is free to register with a different address.
  const initialEmail = searchParams.get('email') ?? ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const agreedRef = useRef<HTMLInputElement>(null)

  function showNavLoader(duration = 3000) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent('kg:loader:show', { detail: { duration } }),
    )
  }

  function validate(): Errors {
    const next: Errors = {}
    if (!name.trim()) next.name = tErr('name_required')
    if (!email.trim()) next.email = tErr('email_required')
    else if (!EMAIL_RE.test(email)) next.email = tErr('email_invalid')
    if (!password) next.password = tErr('password_required')
    else if (password.length < 8) next.password = tErr('password_min')
    if (!agreed) next.agreed = tErr('terms_required')
    return next
  }

  function focusFirstInvalid(next: Errors) {
    if (next.name) {
      nameRef.current?.focus()
      return
    }
    if (next.email) {
      emailRef.current?.focus()
      return
    }
    if (next.password) {
      passwordRef.current?.focus()
      return
    }
    if (next.agreed) {
      agreedRef.current?.focus()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fieldErrors = validate()
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      focusFirstInvalid(fieldErrors)
      return
    }
    setErrors({})
    setLoading(true)
    try {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: redirectTarget,
      })
      if (error) {
        toast.error(error.message ?? tErr('signup_failed'))
        return
      }
      showNavLoader()
      router.push(redirectTarget)
    } catch (err) {
      console.error('[SignupForm]', err)
      toast.error(tErr('signup_failed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    showNavLoader(8000)
    try {
      await authClient.signIn.social({ provider: 'google', callbackURL: redirectTarget })
    } catch (err) {
      console.error('[SignupForm/google]', err)
      toast.error(tErr('google_failed'))
      setLoading(false)
    }
  }

  const agreedErrorId = 'agreed-error'

  return (
    <motion.div
      dir={isRtl ? 'rtl' : 'ltr'}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex flex-col"
    >
      <span
        className={`mb-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)] ${
          isRtl ? 'font-arabic-body !text-[14px] !tracking-normal !normal-case !font-bold' : 'font-display'
        }`}
      >
        {t('eyebrow')}
      </span>
      <h1
        className={`m-0 text-[clamp(24px,3vw,32px)] leading-[1.1] font-bold tracking-[-0.02em] text-[var(--color-fg1)] ${
          isRtl ? 'font-arabic-display' : 'font-arabic-display'
        }`}
      >
        {t('heading')}
      </h1>
      <p
        className={`m-0 mt-1.5 text-[13.5px] leading-[1.45] text-[var(--color-fg2)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      >
        {t('subheading')}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3" noValidate>
        <Field
          ref={nameRef}
          id="name"
          type="text"
          label={t('name_label')}
          placeholder={t('name_placeholder')}
          value={name}
          onChange={(v) => {
            setName(v)
            if (errors.name) setErrors((p) => ({ ...p, name: undefined }))
          }}
          error={errors.name}
          isRtl={isRtl}
          required
          autoComplete="name"
        />
        <Field
          ref={emailRef}
          id="email"
          type="email"
          label={t('email_label')}
          placeholder={t('email_placeholder')}
          value={email}
          onChange={(v) => {
            setEmail(v)
            if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
          }}
          error={errors.email}
          isRtl={isRtl}
          required
          autoComplete="email"
        />
        <Field
          ref={passwordRef}
          id="password"
          type="password"
          label={t('password_label')}
          placeholder={t('password_placeholder')}
          value={password}
          onChange={(v) => {
            setPassword(v)
            if (errors.password) setErrors((p) => ({ ...p, password: undefined }))
          }}
          error={errors.password}
          isRtl={isRtl}
          required
          autoComplete="new-password"
        />

        <div className="flex flex-col gap-1.5">
          <label
            className={`inline-flex items-start gap-2.5 text-[12.5px] leading-[1.4] text-[var(--color-fg2)] cursor-pointer select-none ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            <input
              ref={agreedRef}
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked)
                if (errors.agreed && e.target.checked)
                  setErrors((p) => ({ ...p, agreed: undefined }))
              }}
              aria-invalid={!!errors.agreed}
              aria-describedby={errors.agreed ? agreedErrorId : undefined}
              className="h-4 w-4 mt-0.5 accent-[var(--color-accent)] cursor-pointer flex-shrink-0"
              required
            />
            <span>{t('agree_terms')}</span>
          </label>
          {errors.agreed && (
            <p
              id={agreedErrorId}
              role="alert"
              className={`m-0 text-[13px] leading-[1.4] text-[var(--color-destructive)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {errors.agreed}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-pill btn-pill-primary w-full !py-2.5 !px-6 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {loading ? t('submitting') : t('submit')}
        </button>
      </form>

      <div className="my-4 flex items-center gap-4">
        <span aria-hidden className="block flex-1 h-px bg-[var(--color-border)]" />
        <span
          className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] ${
            isRtl ? 'font-arabic-body !tracking-normal !normal-case !text-[13px] !font-bold' : 'font-display'
          }`}
        >
          {isRtl ? 'أو' : 'Or'}
        </span>
        <span aria-hidden className="block flex-1 h-px bg-[var(--color-border)]" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className={`btn-pill btn-pill-secondary w-full inline-flex items-center justify-center gap-3 !py-2.5 disabled:opacity-60 disabled:cursor-not-allowed ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <GoogleGlyph />}
        {isRtl ? 'تابع باستخدام Google' : 'Continue with Google'}
      </button>

      <p
        className={`mt-4 text-center text-[13.5px] text-[var(--color-fg2)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      >
        {t('have_account')}{' '}
        <Link
          href={withRedirect('/login', redirectTarget)}
          className="link-underline !text-[var(--color-fg1)] hover:!text-[var(--color-accent)]"
        >
          {t('sign_in')}
        </Link>
      </p>
    </motion.div>
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
  error?: string
}

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  {
    id,
    type,
    label,
    placeholder,
    value,
    onChange,
    isRtl,
    required,
    autoComplete,
    error,
  },
  ref,
) {
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={`text-[13px] font-semibold text-[var(--color-fg1)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      >
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`w-full px-4 py-2.5 rounded-[var(--radius-md)] border bg-[var(--color-bg-elevated)] text-[15px] text-[var(--color-fg1)] placeholder:text-[var(--color-fg3)] outline-none transition-[border-color,box-shadow] duration-200 focus:[box-shadow:var(--shadow-focus)] ${
          error
            ? 'border-[var(--color-destructive)] focus:border-[var(--color-destructive)]'
            : 'border-[var(--color-border-strong)] focus:border-[var(--color-accent)]'
        } ${isRtl ? 'font-arabic-body' : 'font-display'}`}
      />
      {error && (
        <p
          id={errorId}
          role="alert"
          className={`m-0 text-[13px] leading-[1.4] text-[var(--color-destructive)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {error}
        </p>
      )}
    </div>
  )
})
