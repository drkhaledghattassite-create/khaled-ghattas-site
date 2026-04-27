'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import { SettingsThemeRadio } from './SettingsThemeRadio'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function SettingsView() {
  const t = useTranslations('dashboard.settings')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [newsletter, setNewsletter] = useState(true)
  const [purchases, setPurchases] = useState(true)

  return (
    <div className="flex flex-col gap-[clamp(40px,5vw,72px)]">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex flex-col gap-3"
      >
        <span
          className={`text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)] ${
            isRtl ? 'font-arabic-body !text-[14px] !tracking-normal !normal-case !font-bold' : 'font-display'
          }`}
        >
          {t('eyebrow')}
        </span>
        <h1
          className={`m-0 text-[clamp(28px,3.6vw,42px)] leading-[1.1] font-bold tracking-[-0.02em] text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display'
          }`}
        >
          {t('heading')}
        </h1>
        <p
          className={`m-0 max-w-[520px] text-[16px] leading-[1.55] text-[var(--color-fg2)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('subheading')}
        </p>
      </motion.header>

      {/* Theme section */}
      <SettingsSection title={t('theme.heading')} description={t('theme.description')} isRtl={isRtl}>
        <SettingsThemeRadio />
      </SettingsSection>

      {/* Language section */}
      <SettingsSection
        title={t('language.heading')}
        description={t('language.description')}
        isRtl={isRtl}
      >
        <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
          <span
            className={`text-[15px] font-semibold text-[var(--color-fg1)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {locale === 'ar' ? 'العربية' : 'English'}
          </span>
          <LocaleSwitcher />
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection title={t('notifications.heading')} isRtl={isRtl}>
        <div className="flex flex-col gap-3">
          <ToggleRow
            label={t('notifications.newsletter_label')}
            description={t('notifications.newsletter_desc')}
            checked={newsletter}
            onChange={setNewsletter}
            isRtl={isRtl}
          />
          <ToggleRow
            label={t('notifications.purchases_label')}
            description={t('notifications.purchases_desc')}
            checked={purchases}
            onChange={setPurchases}
            isRtl={isRtl}
          />
        </div>
      </SettingsSection>

      {/* Sign out everywhere — design qh-logout-btn */}
      <div className="pt-6 mt-2 border-t border-[var(--color-border)]">
        <button
          type="button"
          className={`inline-flex items-center gap-2 px-[18px] py-2.5 rounded-full border border-[var(--color-border-strong)] bg-transparent text-[14px] font-semibold text-[var(--color-fg2)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors ${
            isRtl ? 'font-arabic-body !font-bold' : 'font-display'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {t('logout_everywhere')}
        </button>
      </div>

      {/* Danger zone */}
      <SettingsSection
        title={t('danger.heading')}
        description={t('danger.description')}
        isRtl={isRtl}
        danger
      >
        <button
          type="button"
          className={`btn-pill border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-fg)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
          style={{ borderWidth: 1, background: 'transparent' }}
        >
          {t('danger.delete')}
        </button>
      </SettingsSection>
    </div>
  )
}

function SettingsSection({
  title,
  description,
  children,
  isRtl,
  danger,
}: {
  title: string
  description?: string
  children: React.ReactNode
  isRtl: boolean
  danger?: boolean
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: EASE }}
      className={`pb-[clamp(32px,4vw,48px)] border-b border-[var(--color-border)] last:border-b-0 ${
        danger ? '' : ''
      }`}
    >
      <header className="mb-6">
        <h2
          className={`m-0 text-[20px] font-bold text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.01em]'
          } ${danger ? 'text-[var(--color-accent)]' : ''}`}
        >
          {title}
        </h2>
        {description && (
          <p
            className={`m-0 mt-2 max-w-[520px] text-[14px] leading-[1.55] text-[var(--color-fg2)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {description}
          </p>
        )}
      </header>
      {children}
    </motion.section>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  isRtl,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  isRtl: boolean
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 cursor-pointer hover:border-[var(--color-border-strong)] transition-colors">
      <div className="flex flex-col gap-1.5">
        <span
          className={`text-[15px] font-semibold text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {label}
        </span>
        <span
          className={`text-[13px] leading-[1.5] text-[var(--color-fg2)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {description}
        </span>
      </div>
      <span
        aria-hidden
        className={`relative inline-flex h-6 w-10 flex-shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[inset-inline-start] ${
            checked ? '[inset-inline-start:1.125rem]' : '[inset-inline-start:0.125rem]'
          }`}
        />
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  )
}
