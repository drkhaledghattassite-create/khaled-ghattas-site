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
      ? 'text-[12px] px-4 py-1.5'
      : 'text-[10.5px] px-3 py-1'

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-ink/40 bg-paper-soft p-[3px]',
        pending && 'opacity-60',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => switchTo('ar')}
        aria-pressed={locale === 'ar'}
        className={cn(
          'rounded-full transition-all duration-300 font-display font-medium uppercase tracking-[0.16em] [dir=rtl]:font-arabic [dir=rtl]:font-semibold [dir=rtl]:tracking-normal [dir=rtl]:normal-case',
          sizeClasses,
          locale === 'ar'
            ? 'bg-ink text-paper-soft shadow-[inset_0_0_0_1px_rgba(168,196,214,0.7)]'
            : 'text-ink-muted hover:text-ink',
        )}
      >
        {t('ar')}
      </button>
      <button
        type="button"
        onClick={() => switchTo('en')}
        aria-pressed={locale === 'en'}
        className={cn(
          'rounded-full transition-all duration-300 font-display font-medium uppercase tracking-[0.16em]',
          sizeClasses,
          locale === 'en'
            ? 'bg-ink text-paper-soft shadow-[inset_0_0_0_1px_rgba(168,196,214,0.7)]'
            : 'text-ink-muted hover:text-ink',
        )}
      >
        {t('en')}
      </button>
    </div>
  )
}
