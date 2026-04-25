'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/lib/i18n/navigation'
import { useTransition } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'compact' | 'stacked'

export function LocaleSwitcher({
  variant = 'compact',
  className,
}: {
  variant?: Variant
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

  const sizeClasses =
    variant === 'stacked'
      ? 'text-[13px] px-4 py-2'
      : 'text-[11px] px-3 py-1.5'

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-dashed border-ink p-1',
        pending && 'opacity-60',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => switchTo('ar')}
        aria-pressed={locale === 'ar'}
        className={cn(
          'font-label rounded-full transition-colors duration-200',
          sizeClasses,
          locale === 'ar'
            ? 'bg-ink text-cream'
            : 'bg-transparent text-ink hover:bg-ink/10',
        )}
        style={{ letterSpacing: locale === 'ar' ? 0 : '0.08em' }}
      >
        {t('ar')}
      </button>
      <button
        type="button"
        onClick={() => switchTo('en')}
        aria-pressed={locale === 'en'}
        className={cn(
          'font-label rounded-full transition-colors duration-200',
          sizeClasses,
          locale === 'en'
            ? 'bg-ink text-cream'
            : 'bg-transparent text-ink hover:bg-ink/10',
        )}
        style={{ letterSpacing: '0.08em' }}
      >
        {t('en')}
      </button>
    </div>
  )
}
