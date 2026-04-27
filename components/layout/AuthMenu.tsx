import { getTranslations, getLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { getMockSession } from '@/lib/auth/mock'
import { UserMenuDropdown } from './UserMenuDropdown'
import { cn } from '@/lib/utils'

type Variant = 'compact' | 'stacked'

export async function AuthMenu({
  variant = 'compact',
  className,
}: {
  variant?: Variant
  className?: string
}) {
  const session = await getMockSession()
  const t = await getTranslations('nav')
  const locale = await getLocale()
  const isRtl = locale === 'ar'

  if (session) {
    return (
      <div className={cn('flex items-center', className)}>
        <UserMenuDropdown user={session.user} />
      </div>
    )
  }

  const fontClass = isRtl ? 'font-arabic-body font-bold' : 'font-display font-semibold'

  return (
    <div
      className={cn(
        variant === 'stacked'
          ? 'flex flex-col items-stretch gap-2'
          : 'inline-flex items-center gap-3',
        className,
      )}
    >
      {/* Sign in — plain text link, secondary tone */}
      <Link
        href="/login"
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap transition-colors duration-200',
          variant === 'stacked'
            ? 'py-2 text-[14px] text-[var(--color-fg2)] hover:text-[var(--color-fg1)] order-2 text-center'
            : 'px-1 py-1.5 text-[13.5px] text-[var(--color-fg2)] hover:text-[var(--color-fg1)]',
          fontClass,
          isRtl ? '!text-[14px]' : '!text-[13.5px]',
        )}
      >
        {t('signin')}
      </Link>

      {/* Sign up — accent-filled pill */}
      <Link
        href="/register"
        className={cn(
          'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-0 bg-[var(--color-accent)] text-[var(--color-accent-fg)] transition-[background-color,transform] duration-200 hover:bg-[var(--color-accent-hover)] active:translate-y-px',
          variant === 'stacked'
            ? 'px-4 py-2.5 text-[14px] order-1'
            : 'px-4 py-2 text-[13px]',
          fontClass,
          isRtl ? '!text-[14px] !font-bold' : '!text-[13px]',
        )}
      >
        {t('signup')}
      </Link>
    </div>
  )
}
