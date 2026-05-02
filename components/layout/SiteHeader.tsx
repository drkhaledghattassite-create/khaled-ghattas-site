'use client'

import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link, usePathname } from '@/lib/i18n/navigation'
import { Logo } from '@/components/shared/Logo'
import { LocaleSwitcher } from './LocaleSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { MobileMenu } from './MobileMenu'
import { EASE_EDITORIAL } from '@/lib/motion/variants'

export type NavItem = {
  /** i18n key under the `nav.*` namespace. */
  key: string
  href: string
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { key: 'home', href: '/' },
  { key: 'about', href: '/about' },
  { key: 'store', href: '/books' },
  { key: 'articles', href: '/articles' },
  { key: 'interviews', href: '/interviews' },
  { key: 'events', href: '/events' },
  { key: 'contact', href: '/contact' },
]

type Props = {
  authSlot?: ReactNode
  /** Auth slot rendered inside the mobile drawer (typically the stacked variant). */
  mobileAuthSlot?: ReactNode
  /** Pre-filtered list of nav items (visibility + coming-soon already applied). */
  navItems?: NavItem[]
  showLocaleSwitcher?: boolean
}

export function SiteHeader({
  authSlot,
  mobileAuthSlot,
  navItems = DEFAULT_NAV_ITEMS,
  showLocaleSwitcher = true,
}: Props) {
  const locale = useLocale()
  const t = useTranslations('nav')
  const pathname = usePathname()
  const isRtl = locale === 'ar'
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      <header
        dir={isRtl ? 'rtl' : 'ltr'}
        data-hide-in-focus="true"
        className="sticky top-[var(--site-header-top,0px)] z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/[0.92] backdrop-blur-md backdrop-saturate-[1.2]"
      >
        <div className="mx-auto max-w-[var(--container-max)] grid grid-cols-[auto_1fr_auto] items-center gap-4 md:gap-6 [padding:12px_10px] md:[padding:14px_clamp(20px,5vw,56px)]">
          {/* Mark */}
          <Link
            href="/"
            aria-label={t('brand')}
            className={`inline-flex items-center gap-2 md:gap-2.5 text-[14px] md:text-[15px] font-bold text-[var(--color-fg1)] transition-opacity hover:opacity-80 ${
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
            {navItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative py-1 text-[13.5px] transition-colors ${
                    active
                      ? 'text-[var(--color-fg1)] font-semibold'
                      : 'text-[var(--color-fg2)] hover:text-[var(--color-fg1)] font-medium'
                  } ${isRtl ? 'font-arabic-body' : 'font-display'}`}
                >
                  {t(item.key)}
                  {active && (
                    <motion.span
                      layoutId="site-nav-active"
                      aria-hidden
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-x-0 -bottom-px block h-[2px] rounded-full bg-[var(--color-accent)]"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-1.5 justify-self-end">
            {showLocaleSwitcher && <LocaleSwitcher />}
            <ThemeToggle />
            {authSlot && <div className="hidden md:flex ms-1">{authSlot}</div>}

            {/* Mobile hamburger — 44×44 touch target (WCAG 2.5.5). */}
            <motion.button
              type="button"
              aria-label={t('menu')}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu-panel"
              onClick={() => setMenuOpen(true)}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.18, ease: EASE_EDITORIAL }}
              className="group md:hidden ms-1 inline-flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] transition-[border-color,background-color] duration-200 hover:border-[var(--color-border-strong)] active:bg-[var(--color-bg-deep)]"
            >
              <span aria-hidden className="block h-px w-4 bg-[var(--color-fg1)] transition-transform duration-200 group-hover:translate-y-[-1px]" />
              <span aria-hidden className="block h-px w-3 bg-[var(--color-accent)]" />
              <span aria-hidden className="block h-px w-4 bg-[var(--color-fg1)] transition-transform duration-200 group-hover:translate-y-[1px]" />
            </motion.button>
          </div>
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        authSlot={mobileAuthSlot}
        navItems={navItems}
        showLocaleSwitcher={showLocaleSwitcher}
      />
    </>
  )
}
