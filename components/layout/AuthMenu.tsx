import { getTranslations, getLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import { AUTH_ENABLED } from '@/lib/constants'
import { UserMenuDropdown } from './UserMenuDropdown'
import { cn } from '@/lib/utils'

type Variant = 'compact' | 'stacked'

/**
 * Single "Sign in" entry — once on the form, the user can toggle to /register
 * via the existing footer link.
 *
 * The `enabled` prop is the runtime gate (settings.features.auth_enabled);
 * when omitted, falls back to the build-time NEXT_PUBLIC_AUTH_ENABLED env var
 * for backward compatibility with callers that don't yet pass settings.
 */
export async function AuthMenu({
  variant = 'compact',
  className,
  enabled,
}: {
  variant?: Variant
  className?: string
  enabled?: boolean
}) {
  const isEnabled = enabled ?? AUTH_ENABLED
  if (!isEnabled) return null

  let session, t, locale
  try {
    session = await getServerSession()
    console.log('[AuthMenu] session ok, present=', !!session)
  } catch (e) {
    console.error('[AuthMenu] getServerSession failed', e)
    throw e
  }
  try {
    t = await getTranslations('nav')
  } catch (e) {
    console.error('[AuthMenu] getTranslations failed', e)
    throw e
  }
  try {
    locale = await getLocale()
  } catch (e) {
    console.error('[AuthMenu] getLocale failed', e)
    throw e
  }
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
        variant === 'stacked' ? 'flex justify-stretch' : 'inline-flex items-center',
        className,
      )}
    >
      <Link
        href="/login"
        className={cn(
          'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-0 bg-[var(--color-accent)] text-[var(--color-accent-fg)]',
          'transition-[background-color,transform] duration-200 hover:bg-[var(--color-accent-hover)] active:translate-y-px',
          variant === 'stacked'
            ? 'w-full px-4 py-3 text-[14px]'
            : 'px-4 py-2 text-[13px]',
          fontClass,
          isRtl ? '!text-[14px] !font-bold' : '!text-[13px]',
        )}
      >
        {t('signin')}
      </Link>
    </div>
  )
}
