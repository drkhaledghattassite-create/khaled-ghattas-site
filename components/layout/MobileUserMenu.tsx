'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/lib/i18n/navigation'
import type { ServerSessionUser } from '@/lib/auth/server'
import { authClient } from '@/lib/auth/client'
import { cn } from '@/lib/utils'

const initialOf = (name: string) =>
  name.trim().split(/\s+/)[0]?.charAt(0).toUpperCase() ?? 'U'

const Icon = {
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" />
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
}

/**
 * Inline user-menu card for the mobile drawer.
 *
 * On desktop the header uses {@link UserMenuDropdown} (a button + popup).
 * That popup pattern fails inside the off-canvas mobile drawer because:
 *   1. The trigger lives at the bottom of the panel, so a downward popup
 *      renders below the viewport.
 *   2. In RTL the trigger sits at the start side of the drawer, so an
 *      `end-0` anchored popup overflows the drawer's opposite edge.
 * Rather than fight popup positioning inside a constrained side panel,
 * we render the menu contents inline: identity card on top, action rows
 * below. Tapping a navigation link closes the drawer via the parent's
 * event-delegation handler in MobileMenu; tapping Sign out runs locally
 * and then navigates to /login.
 */
export function MobileUserMenu({ user }: { user: ServerSessionUser }) {
  const t = useTranslations('nav')
  const locale = useLocale()
  const router = useRouter()
  const isRtl = locale === 'ar'

  async function handleSignOut() {
    try {
      await authClient.signOut()
    } catch (err) {
      console.error('[MobileUserMenu signOut]', err)
    }
    router.push('/login')
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Identity card */}
      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3">
        <span
          aria-hidden
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[16px] font-bold',
            isRtl ? 'font-arabic-body' : 'font-display',
          )}
        >
          {initialOf(user.name)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className={cn(
              'truncate text-[15px] font-bold leading-[1.3] text-[var(--color-fg1)]',
              isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.01em]',
            )}
          >
            {user.name}
          </span>
          {/* dir="ltr" keeps Latin email aligned naturally + truncates from
              the .com end instead of clipping the username start in RTL. */}
          <span className="truncate text-[12px] text-[var(--color-fg3)]" dir="ltr" title={user.email}>
            {user.email}
          </span>
        </div>
      </div>

      {/* Action list — links navigate (drawer closes via parent delegation),
          sign-out runs locally then redirects. */}
      <ul className="m-0 flex flex-col gap-0.5 p-0 list-none">
        <li>
          <Link
            href="/dashboard"
            className={cn(
              'group flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-[15px] text-[var(--color-fg1)]',
              'transition-colors duration-150 hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]',
              isRtl ? 'font-arabic-body' : 'font-display',
            )}
          >
            <span className="text-[var(--color-fg3)] group-hover:text-[var(--color-accent)] transition-colors">
              {Icon.user}
            </span>
            <span>{t('account')}</span>
          </Link>
        </li>
        {user.role === 'ADMIN' && (
          <li>
            <Link
              href="/admin"
              className={cn(
                'group flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-[15px] text-[var(--color-fg1)]',
                'transition-colors duration-150 hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]',
                isRtl ? 'font-arabic-body' : 'font-display',
              )}
            >
              <span className="text-[var(--color-fg3)] group-hover:text-[var(--color-accent)] transition-colors">
                {Icon.shield}
              </span>
              <span>{t('admin')}</span>
            </Link>
          </li>
        )}
        <li className="my-1 h-px bg-[var(--color-border)]" />
        <li>
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              'group flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-[15px] text-[var(--color-fg1)] text-start',
              'transition-colors duration-150 hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]',
              isRtl ? 'font-arabic-body' : 'font-display',
            )}
          >
            <span className="text-[var(--color-fg3)] group-hover:text-[var(--color-accent)] transition-colors">
              {Icon.logout}
            </span>
            <span>{t('signout')}</span>
          </button>
        </li>
      </ul>
    </div>
  )
}
