'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Link, useRouter } from '@/lib/i18n/navigation'
import { authClient } from '@/lib/auth/client'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function ResetPasswordForm() {
  const t = useTranslations('auth.reset')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      toast.error(t('missing_token'))
      return
    }
    if (password !== confirm) {
      toast.error(t('mismatch'))
      return
    }

    setLoading(true)
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      })
      if (error) {
        toast.error(error.message ?? 'Could not reset password.')
        return
      }
      toast.success(t('success'))
      router.push('/login')
    } catch (err) {
      console.error('[ResetPassword]', err)
      toast.error('Could not reset password.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="flex flex-col gap-4">
        <span className="section-eyebrow !text-accent">{t('eyebrow')}</span>
        <h1 className="section-title">{t('missing_token')}</h1>
        <Link href="/forgot-password" className="link-underline mt-2 self-start">
          {isRtl ? 'طلب رابط جديد' : 'Request a new link'}
        </Link>
      </div>
    )
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
        className={`mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-accent ${
          isRtl ? 'font-arabic-body !text-[14px] !tracking-normal !normal-case !font-bold' : 'font-display'
        }`}
      >
        {t('eyebrow')}
      </span>
      <h1 className="m-0 text-[clamp(28px,3.6vw,40px)] leading-[1.1] font-bold tracking-[-0.02em] text-fg1 font-arabic-display">
        {t('heading')}
      </h1>
      <p className={`m-0 mt-3 text-[16px] leading-[1.55] text-fg2 ${
        isRtl ? 'font-arabic-body' : 'font-display'
      }`}>
        {t('subheading')}
      </p>

      <form onSubmit={handleSubmit} className="mt-9 flex flex-col gap-5" noValidate>
        <Field
          id="password"
          label={t('password_label')}
          placeholder={t('password_placeholder')}
          value={password}
          onChange={setPassword}
          isRtl={isRtl}
        />
        <Field
          id="confirm"
          label={t('confirm_label')}
          placeholder={t('confirm_placeholder')}
          value={confirm}
          onChange={setConfirm}
          isRtl={isRtl}
        />

        <button
          type="submit"
          disabled={loading}
          className="btn-pill btn-pill-primary w-full mt-2 !py-3.5 !px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('submitting') : t('submit')}
        </button>
      </form>
    </motion.div>
  )
}

function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
  isRtl,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  isRtl: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={`text-[13px] font-semibold text-fg1 ${
        isRtl ? 'font-arabic-body' : 'font-display'
      }`}>
        {label}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        autoComplete="new-password"
        className={`w-full px-4 py-3 rounded-[var(--radius-md)] border border-border-strong bg-bg-elevated text-[15px] text-fg1 placeholder:text-fg3 outline-none transition-[border-color,box-shadow] duration-200 focus:border-accent focus:[box-shadow:var(--shadow-focus)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      />
    </div>
  )
}
