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
        'inline-flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-raised)]/80 backdrop-blur-sm p-[3px]',
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
            'rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200',
            locale === lng
              ? 'bg-[var(--color-text)] text-[var(--color-surface)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            lng === 'ar'
              ? '[dir=rtl]:font-arabic [dir=rtl]:font-semibold'
              : 'font-display uppercase tracking-[0.12em]',
          )}
        >
          {t(lng)}
        </button>
      ))}
    </div>
  )
}
