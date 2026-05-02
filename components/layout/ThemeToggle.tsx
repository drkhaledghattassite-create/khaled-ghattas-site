'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const t = useTranslations('common')

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <span className="inline-block h-11 w-11" />
  }

  const isDark = resolvedTheme === 'dark'
  const label = isDark ? t('theme_light') : t('theme_dark')

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-transparent text-[var(--color-fg2)] transition-[colors,background-color] duration-300 ease-[var(--ease-editorial)] hover:text-[var(--color-fg1)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-accent-soft)]"
    >
      <span
        className="inline-flex items-center justify-center transition-transform duration-500 ease-[var(--ease-editorial)] group-hover:rotate-[12deg]"
        style={{ transform: isDark ? 'rotate(0deg)' : 'rotate(-30deg)' }}
      >
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </span>
    </button>
  )
}
