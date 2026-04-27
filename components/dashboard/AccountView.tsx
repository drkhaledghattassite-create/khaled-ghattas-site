'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import type { MockUser } from '@/lib/auth/mock'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function AccountView({ user }: { user: MockUser }) {
  const t = useTranslations('dashboard.account')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [bio, setBio] = useState(
    isRtl
      ? 'قارئ شغوف بالفلسفة والأدب والعلوم السلوكية.'
      : 'A reader passionate about philosophy, literature, and behavioral science.',
  )
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    setSaving(false)
    toast.success(t('saved'))
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex flex-col gap-[clamp(28px,3.5vw,44px)]"
    >
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
        <Field
          id="email"
          type="email"
          label={t('email')}
          value={email}
          onChange={setEmail}
          isRtl={isRtl}
          required
          autoComplete="email"
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

