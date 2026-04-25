import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { getMockSession } from '@/lib/auth/mock'
import { UserMenuDropdown } from './UserMenuDropdown'
import { cn } from '@/lib/utils'

type Variant = 'compact' | 'stacked'

const PILL_BASE =
  'font-label inline-flex items-center gap-2 rounded-full border border-dashed border-ink transition-colors duration-200'

export async function AuthMenu({
  variant = 'compact',
  className,
}: {
  variant?: Variant
  className?: string
}) {
  const session = await getMockSession()
  const t = await getTranslations('nav')

  if (session) {
    return (
      <div className={cn('flex items-center', className)}>
        <UserMenuDropdown user={session.user} />
      </div>
    )
  }

  const sizeClasses =
    variant === 'stacked'
      ? 'px-4 py-2 text-[13px]'
      : 'px-3 py-1.5 text-[11px]'

  return (
    <div
      className={cn(
        variant === 'stacked' ? 'flex flex-row items-center gap-2' : 'inline-flex items-center gap-2',
        className,
      )}
    >
      <Link
        href="/login"
        className={cn(PILL_BASE, sizeClasses, 'text-ink hover:bg-ink hover:text-cream')}
        style={{ letterSpacing: '0.08em' }}
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink" />
        {t('signin')}
      </Link>
      <Link
        href="/register"
        className={cn(
          PILL_BASE,
          sizeClasses,
          'bg-ink text-cream hover:bg-transparent hover:text-ink',
        )}
        style={{ letterSpacing: '0.08em' }}
      >
        {t('signup')}
      </Link>
    </div>
  )
}
