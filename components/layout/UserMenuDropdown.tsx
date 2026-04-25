'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import type { MockUser } from '@/lib/auth/mock'
import { cn } from '@/lib/utils'

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')

export function UserMenuDropdown({ user }: { user: MockUser }) {
  const t = useTranslations('nav')
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
          'inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-ink',
          'font-label text-[12px] text-ink transition-colors duration-200',
          'hover:bg-ink hover:text-cream',
        )}
      >
        {initialsOf(user.name)}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={user.name}
          className="absolute end-0 top-[calc(100%+8px)] z-[60] min-w-[200px] rounded-md border border-dashed border-ink bg-cream-soft p-1 shadow-[0_8px_24px_-12px_rgba(37,35,33,0.25)]"
        >
          <div className="border-b border-dashed border-ink/30 px-3 py-2">
            <div className="font-label text-[11px] text-ink-muted">{user.role}</div>
            <div className="truncate text-[13px] text-ink">{user.name}</div>
          </div>
          <MenuItem href="/dashboard" onSelect={() => setOpen(false)}>
            {t('dashboard')}
          </MenuItem>
          <MenuItem href="/dashboard" onSelect={() => setOpen(false)}>
            {t('account')}
          </MenuItem>
          {user.role === 'ADMIN' && (
            <MenuItem href="/admin" onSelect={() => setOpen(false)}>
              {t('admin')}
            </MenuItem>
          )}
          <MenuItem href="/login" onSelect={() => setOpen(false)} variant="muted">
            {t('signout')}
          </MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  href,
  onSelect,
  variant = 'default',
  children,
}: {
  href: string
  onSelect: () => void
  variant?: 'default' | 'muted'
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className={cn(
        'block rounded-sm px-3 py-2 text-[13px] transition-colors duration-150',
        'hover:bg-ink hover:text-cream',
        variant === 'muted' ? 'text-ink-muted' : 'text-ink',
      )}
    >
      {children}
    </Link>
  )
}
