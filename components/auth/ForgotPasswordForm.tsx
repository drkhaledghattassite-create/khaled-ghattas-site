'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Link } from '@/lib/i18n/navigation'
import { authClient } from '@/lib/auth/client'
import { safeRedirect, withRedirect } from '@/lib/auth/redirect'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgot')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const searchParams = useSearchParams()
  const redirectTarget = safeRedirect(searchParams.get('redirect'))
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: withRedirect('/reset-password', redirectTarget),
      })
      if (error) {
        toast.error(error.message ?? 'Could not send reset link.')
        return
      }
      setDone(true)
    } catch (err) {
      console.error('[ForgotPassword]', err)
      toast.error('Could not send reset link.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="flex flex-col gap-4">
        <span className="section-eyebrow !text-accent">{t('eyebrow')}</span>
        <h1 className="section-title">{t('success_title')}</h1>
        <p className="text-base text-fg2 leading-relaxed">{t('success_text')}</p>
        <Link
          href={withRedirect('/login', redirectTarget)}
          className="link-underline mt-2 self-start"
        >
          {t('back_to_login')}
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
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className={`text-[13px] font-semibold text-fg1 ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}>
            {t('email_label')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('email_placeholder')}
            required
            autoComplete="email"
            className={`w-full px-4 py-3 rounded-[var(--radius-md)] border border-border-strong bg-bg-elevated text-[15px] text-fg1 placeholder:text-fg3 outline-none transition-[border-color,box-shadow] duration-200 focus:border-accent focus:[box-shadow:var(--shadow-focus)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-pill btn-pill-primary w-full mt-2 !py-3.5 !px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('submitting') : t('submit')}
        </button>
      </form>

      <p className={`mt-8 text-center text-[14px] text-fg2 ${
        isRtl ? 'font-arabic-body' : 'font-display'
      }`}>
        <Link
          href={withRedirect('/login', redirectTarget)}
          className="link-underline !text-fg1 hover:!text-accent"
        >
          {t('back_to_login')}
        </Link>
      </p>
    </motion.div>
  )
}
