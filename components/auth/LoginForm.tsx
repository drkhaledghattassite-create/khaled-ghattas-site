'use client'

import { forwardRef, useRef, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Loader2, ShieldAlert } from 'lucide-react'
import { Link, useRouter } from '@/lib/i18n/navigation'
import { authClient } from '@/lib/auth/client'
import { safeRedirect, withRedirect } from '@/lib/auth/redirect'
import { resendVerificationAction } from '@/app/[locale]/(auth)/actions'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Errors = {
  email?: string
  password?: string
}

export function LoginForm() {
  const t = useTranslations('auth.login')
  const tErr = useTranslations('auth.errors')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRtl = locale === 'ar'
  const redirectTarget = safeRedirect(searchParams.get('redirect'))
  // Symmetric with SignupForm: pre-fill the email field when the redirect
  // flow knows it (e.g. /gifts/claim → /login?redirect=…&email=…). Editable.
  const initialEmail = searchParams.get('email') ?? ''

  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  // Phase H Item 4 — gate the resend-verification button on a real
  // failure signal from Better Auth. We only flip this true when
  // signin returns an "email not verified" -shaped error; otherwise
  // the panel stays hidden so users who mistyped their password don't
  // get the resend affordance.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resending, startResend] = useTransition()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  function showNavLoader(duration = 3000) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent('kg:loader:show', { detail: { duration } }),
    )
  }

  function validate(): Errors {
    const next: Errors = {}
    if (!email.trim()) next.email = tErr('email_required')
    else if (!EMAIL_RE.test(email)) next.email = tErr('email_invalid')
    if (!password) next.password = tErr('password_required')
    return next
  }

  function focusFirstInvalid(next: Errors) {
    if (next.email) {
      emailRef.current?.focus()
      return
    }
    if (next.password) {
      passwordRef.current?.focus()
    }
  }

  // Detect the email-not-verified case from Better Auth's error shape.
  // BA exposes either a `code` (newer versions: 'EMAIL_NOT_VERIFIED')
  // or a message string we string-match as a fallback. Defensive against
  // shape drift across BA versions.
  function isEmailNotVerifiedError(err: {
    code?: string
    message?: string
    status?: number
  } | null | undefined): boolean {
    if (!err) return false
    if (err.code && /verif/i.test(err.code)) return true
    if (err.message && /(not\s+verified|verify\s+(?:your\s+)?email)/i.test(err.message)) {
      return true
    }
    return false
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
    setUnverifiedEmail(null)
    setLoading(true)
    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        rememberMe: remember,
        callbackURL: redirectTarget,
      })
      if (error) {
        if (isEmailNotVerifiedError(error)) {
          // Capture the email the user entered (not the BA-supplied one,
          // which may be empty) so the resend button can show the
          // address and the action has something to send to.
          setUnverifiedEmail(email)
          toast.error(tErr('email_not_verified'))
          return
        }
        toast.error(error.message ?? tErr('submit_failed'))
        return
      }
      // Cover the redirect transition — handles both client-side router.push
      // and the full-page redirect that Better Auth may perform via callbackURL.
      showNavLoader()
      router.push(redirectTarget)
    } catch (err) {
      console.error('[LoginForm]', err)
      toast.error(tErr('submit_failed'))
    } finally {
      setLoading(false)
    }
  }

  function handleResendVerification() {
    if (!unverifiedEmail) return
    startResend(async () => {
      const result = await resendVerificationAction({ email: unverifiedEmail })
      if (result.ok) {
        toast.success(tErr('verification_resent'))
        return
      }
      if (result.error === 'rate_limited') {
        toast.error(tErr('verification_rate_limited'))
        return
      }
      toast.error(tErr('verification_resend_failed'))
    })
  }

  async function handleGoogle() {
    setLoading(true)
    showNavLoader(8000)
    try {
      await authClient.signIn.social({ provider: 'google', callbackURL: redirectTarget })
    } catch (err) {
      console.error('[LoginForm/google]', err)
      toast.error(tErr('google_failed'))
      setLoading(false)
    }
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
        className={`m-0 mt-2 text-[14.5px] leading-[1.5] text-[var(--color-fg2)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      >
        {t('subheading')}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3.5" noValidate>
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
          autoComplete="current-password"
          trailingLink={{
            label: t('forgot'),
            href: withRedirect('/forgot-password', redirectTarget),
          }}
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
          className="btn-pill btn-pill-primary w-full mt-1 !py-3 !px-6 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {loading ? t('submitting') : t('submit')}
        </button>
      </form>

      {/* Phase H Item 4 — only rendered when signin returned the
          "email not verified" error. Hidden otherwise so a wrong-password
          attempt doesn't surface a resend affordance (which would let an
          attacker confirm the email exists). */}
      {unverifiedEmail && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] px-4 py-3.5"
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
                {tErr('email_not_verified_title')}
              </p>
              <p
                className={`m-0 text-[13px] leading-[1.55] text-[var(--color-fg2)] ${
                  isRtl ? 'font-arabic-body !text-[14px]' : 'font-display'
                }`}
              >
                {tErr('email_not_verified_body', { email: unverifiedEmail })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resending}
            className={`btn-pill btn-pill-secondary inline-flex items-center justify-center gap-2 !text-[13px] !py-2 !px-4 self-start disabled:opacity-60 disabled:cursor-not-allowed ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {resending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            )}
            {resending
              ? tErr('verification_resending')
              : tErr('verification_resend_cta')}
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="my-5 flex items-center gap-4">
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
        onClick={handleGoogle}
        disabled={loading}
        className={`btn-pill btn-pill-secondary w-full inline-flex items-center justify-center gap-3 !py-2.5 disabled:opacity-60 disabled:cursor-not-allowed ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <GoogleGlyph />}
        {t('google')}
      </button>

      {/* Footer link — center-aligned per design */}
      <p
        className={`mt-5 text-center text-[14px] text-[var(--color-fg2)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      >
        {t('no_account')}{' '}
        <Link
          href={withRedirect('/register', redirectTarget)}
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
  error?: string
  trailingLink?: { label: string; href: string }
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
    trailingLink,
  },
  ref,
) {
  const errorId = `${id}-error`
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
