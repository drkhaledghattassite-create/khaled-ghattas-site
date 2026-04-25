import { getTranslations, getLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { getMockSession } from '@/lib/auth/mock'
import { UserMenuDropdown } from './UserMenuDropdown'
import { cn } from '@/lib/utils'

type Variant = 'compact' | 'stacked'

const PILL_BASE =
  'inline-flex items-center gap-2 rounded-full border transition-all duration-300'

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

  const sizeClasses =
    variant === 'stacked' ? 'px-4 py-2 text-[12px]' : 'px-3.5 py-1.5 text-[10.5px]'

  const fontStyleProps: React.CSSProperties = {
    fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
    fontWeight: isRtl ? 600 : 500,
    letterSpacing: isRtl ? 0 : '0.16em',
    textTransform: isRtl ? 'none' : 'uppercase',
  }

  return (
    <div
      className={cn(
        variant === 'stacked' ? 'flex flex-row items-center gap-2' : 'inline-flex items-center gap-2',
        className,
      )}
    >
      <Link
        href="/login"
        className={cn(PILL_BASE, sizeClasses, 'border-ink/40 text-ink hover:border-ink hover:bg-ink hover:text-paper-soft')}
        style={fontStyleProps}
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brass" />
        {t('signin')}
      </Link>
      <Link
        href="/register"
        className={cn(
          PILL_BASE,
          sizeClasses,
          'border-ink bg-ink text-paper-soft hover:bg-brass-deep hover:border-brass-deep',
        )}
        style={fontStyleProps}
      >
        {t('signup')}
      </Link>
    </div>
  )
}
