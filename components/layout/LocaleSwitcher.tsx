'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/lib/i18n/navigation'
import { useTransition } from 'react'
import { cn } from '@/lib/utils'
import { withViewTransition } from '@/lib/motion/nav-transition'

/**
 * Alternate-only locale switcher (Apple-style).
 * Renders a single button showing the language code you'd switch TO.
 * Latin font + tabular nums for visual stability across both locales.
 */
export function LocaleSwitcher({
  className,
}: {
  className?: string
}) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('common.language_switch')
  const [pending, startTransition] = useTransition()

  const target: 'ar' | 'en' = locale === 'ar' ? 'en' : 'ar'
  const label = target.toUpperCase()
  const aria = target === 'ar' ? t('aria_switch_to_ar') : t('aria_switch_to_en')

  const handleClick = () => {
    startTransition(() => {
      withViewTransition(() => router.replace(pathname, { locale: target }))
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={aria}
      title={aria}
      disabled={pending}
      className={cn(
        'inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-transparent px-2.5',
        'text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg2)]',
        'transition-[color,border-color,background-color,transform] duration-200',
        'hover:text-[var(--color-fg1)] hover:border-[var(--color-border-strong)]',
        'active:translate-y-px',
        pending && 'opacity-50 pointer-events-none',
        className,
      )}
      style={{
        fontFamily: 'var(--font-display)',
        fontFeatureSettings: '"tnum" 1, "lnum" 1',
      }}
    >
      {label}
    </button>
  )
}
