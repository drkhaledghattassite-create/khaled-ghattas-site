'use client'

import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import { Logo } from '@/components/shared/Logo'
import { LocaleSwitcher } from './LocaleSwitcher'
import { ThemeToggle } from './ThemeToggle'

const NAV_ITEMS = [
  { key: 'home', href: '/' },
  { key: 'about', href: '/about' },
  { key: 'store', href: '/books' },
  { key: 'articles', href: '/articles' },
  { key: 'interviews', href: '/interviews' },
  { key: 'contact', href: '/contact' },
] as const

export function SiteHeader({ authSlot }: { authSlot?: ReactNode }) {
  const locale = useLocale()
  const t = useTranslations('nav')
  const isRtl = locale === 'ar'

  return (
    <header
      dir={isRtl ? 'rtl' : 'ltr'}
      data-hide-in-focus="true"
      className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/[0.92] backdrop-blur-md backdrop-saturate-[1.2]"
    >
      <div className="mx-auto max-w-[var(--container-max)] grid grid-cols-[auto_1fr_auto] items-center gap-6 [padding:14px_clamp(20px,5vw,56px)]">
        {/* Mark — single Link wraps Logo image + brand name */}
        <Link
          href="/"
          aria-label={t('brand')}
          className={`inline-flex items-center gap-2.5 text-[15px] font-bold text-[var(--color-fg1)] transition-opacity hover:opacity-80 ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.01em]'
          }`}
        >
          <Logo height={22} alt="" />
          <span className="whitespace-nowrap hidden sm:inline">{t('brand')}</span>
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label={t('primary')}
          className="hidden md:flex justify-self-center gap-[clamp(16px,2.4vw,32px)]"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`text-[13.5px] font-medium text-[var(--color-fg2)] hover:text-[var(--color-fg1)] transition-colors ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-1.5">
          <LocaleSwitcher />
          <ThemeToggle />
          {authSlot && <div className="hidden md:flex ms-1">{authSlot}</div>}
        </div>
      </div>
    </header>
  )
}
