'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/lib/i18n/navigation'
import { useTransition } from 'react'
import { cn } from '@/lib/utils'

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

  const switchTo = (next: 'ar' | 'en') => {
    if (next === locale) return
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-transparent p-[2px]',
        pending && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {(['ar', 'en'] as const).map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => switchTo(lng)}
          aria-pressed={locale === lng}
          className={cn(
            'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200',
            locale === lng
              ? 'bg-[var(--color-fg1)] text-[var(--color-bg)]'
              : 'text-[var(--color-fg3)] hover:text-[var(--color-fg1)]',
            lng === 'ar'
              ? '[dir=rtl]:font-arabic'
              : 'font-display uppercase tracking-[0.06em]',
          )}
        >
          {t(lng)}
        </button>
      ))}
    </div>
  )
}
