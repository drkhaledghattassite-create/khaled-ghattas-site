'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import type { MockUser } from '@/lib/auth/mock'
import { cn } from '@/lib/utils'

const initialOf = (name: string) =>
  name.trim().split(/\s+/)[0]?.charAt(0).toUpperCase() ?? 'U'

const Icon = {
  user: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  ),
  shield: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" />
    </svg>
  ),
  logout: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
}

export function UserMenuDropdown({ user }: { user: MockUser }) {
  const t = useTranslations('nav')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user.name}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)]',
          'text-[13px] font-bold transition-[box-shadow] duration-200',
          'hover:[box-shadow:0_0_0_3px_var(--color-accent-soft)] focus-visible:outline-none focus-visible:[box-shadow:0_0_0_3px_var(--color-accent-soft)]',
          isRtl ? 'font-arabic-body' : 'font-display',
        )}
      >
        {initialOf(user.name)}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={user.name}
          className={cn(
            'absolute end-0 top-[calc(100%+12px)] z-[60] min-w-[260px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]',
            '[box-shadow:var(--shadow-lift)]',
            'opacity-100 transform-none transition-[opacity,transform] duration-150',
          )}
        >
          {/* Identity header — avatar + name + email */}
          <div className="flex items-center gap-3 px-[18px] py-4 border-b border-[var(--color-border)]">
            <span
              aria-hidden
              className={cn(
                'inline-flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[15px] font-bold shrink-0',
                isRtl ? 'font-arabic-body' : 'font-display',
              )}
            >
              {initialOf(user.name)}
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className={cn(
                  'truncate text-[14px] font-bold leading-[1.3] text-[var(--color-fg1)]',
                  isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.01em]',
                )}
              >
                {user.name}
              </span>
              <span
                className={cn(
                  'truncate text-[12px] text-[var(--color-fg3)] [font-feature-settings:"tnum"]',
                  isRtl ? 'font-arabic-body' : 'font-display',
                )}
              >
                {user.email}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <ul className="m-0 p-1.5 list-none">
            <MenuItem
              href="/dashboard"
              onSelect={() => setOpen(false)}
              icon={Icon.user}
              isRtl={isRtl}
            >
              {t('account')}
            </MenuItem>
            {user.role === 'ADMIN' && (
              <MenuItem
                href="/admin"
                onSelect={() => setOpen(false)}
                icon={Icon.shield}
                isRtl={isRtl}
              >
                {t('admin')}
              </MenuItem>
            )}
            <li className="my-1.5 h-px bg-[var(--color-border)]" />
            <MenuItem
              href="/login"
              onSelect={() => setOpen(false)}
              icon={Icon.logout}
              isRtl={isRtl}
            >
              {t('signout')}
            </MenuItem>
          </ul>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  href,
  onSelect,
  icon,
  isRtl,
  children,
}: {
  href: string
  onSelect: () => void
  icon: React.ReactNode
  isRtl: boolean
  children: React.ReactNode
}) {
  return (
    <li>
      <Link
        href={href}
        role="menuitem"
        onClick={onSelect}
        className={cn(
          'group flex items-center gap-3 w-full rounded-[var(--radius-sm)] px-3 py-2.5 text-[14px] text-[var(--color-fg1)]',
          'transition-colors duration-150',
          'hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]',
          isRtl ? 'font-arabic-body !text-[14px]' : 'font-display',
        )}
      >
        <span className="text-[var(--color-fg3)] group-hover:text-[var(--color-accent)] transition-colors">
          {icon}
        </span>
        <span>{children}</span>
      </Link>
    </li>
  )
}
