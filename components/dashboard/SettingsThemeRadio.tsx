'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { useLocale, useTranslations } from 'next-intl'
import { Sun, Moon, Monitor } from 'lucide-react'

type ThemeKey = 'light' | 'dark' | 'system'

const ICONS: Record<ThemeKey, React.ComponentType<{ size?: number }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

export function SettingsThemeRadio() {
  const t = useTranslations('dashboard.settings.theme')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const items: { key: ThemeKey; label: string; desc: string }[] = [
    { key: 'light', label: t('light_label'), desc: t('light_desc') },
    { key: 'dark', label: t('dark_label'), desc: t('dark_desc') },
    { key: 'system', label: t('system_label'), desc: t('system_desc') },
  ]

  const current = (mounted ? theme : 'system') as ThemeKey

  return (
    <div role="radiogroup" aria-label={t('heading')} className="grid gap-3 md:grid-cols-3">
      {items.map((item) => {
        const Icon = ICONS[item.key]
        const checked = current === item.key
        return (
          <label
            key={item.key}
            className={`relative flex flex-col gap-3 rounded-[var(--radius-md)] border bg-[var(--color-bg-elevated)] p-5 cursor-pointer transition-all duration-200 ${
              checked
                ? 'border-[var(--color-accent)] [box-shadow:0_0_0_1px_var(--color-accent)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
            }`}
          >
            <input
              type="radio"
              name="theme"
              value={item.key}
              checked={checked}
              onChange={() => setTheme(item.key)}
              className="sr-only"
            />
            <div className="flex items-center justify-between gap-3">
              <span
                className={`inline-flex items-center justify-center w-9 h-9 rounded-full ${
                  checked
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
                    : 'bg-[var(--color-bg-deep)] text-[var(--color-fg2)]'
                }`}
              >
                <Icon size={16} />
              </span>
              <span
                aria-hidden
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                  checked
                    ? 'border-[var(--color-accent)]'
                    : 'border-[var(--color-border-strong)]'
                }`}
              >
                {checked && (
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
                )}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span
                className={`text-[15px] font-bold text-[var(--color-fg1)] ${
                  isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.01em]'
                }`}
              >
                {item.label}
              </span>
              <span
                className={`text-[13px] leading-[1.5] text-[var(--color-fg2)] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {item.desc}
              </span>
            </div>
          </label>
        )
      })}
    </div>
  )
}
