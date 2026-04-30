'use client'

import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, Link } from '@/lib/i18n/navigation'
import { motion } from 'motion/react'
import { MobileMenu } from './MobileMenu'
import { EASE_EDITORIAL } from '@/lib/motion/variants'

const QUICK_LINKS = [
  { key: 'about', href: '/about' },
  { key: 'articles', href: '/articles' },
  { key: 'store', href: '/books' },
] as const

export function BottomNav({ mobileAuthSlot }: { mobileAuthSlot?: ReactNode }) {
  const locale = useLocale()
  const t = useTranslations('nav')
  const isRtl = locale === 'ar'
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      <nav
        aria-label={t('primary')}
        dir={isRtl ? 'rtl' : 'ltr'}
        data-hide-in-focus="true"
        className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-bg)]/[0.96] backdrop-blur-md backdrop-saturate-[1.2]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
      >
        <div className="mx-auto max-w-[var(--container-max)] flex items-center justify-between gap-2 px-5 h-[56px]">
          <ul className="flex items-center gap-5 list-none m-0 p-0">
            {QUICK_LINKS.map((item) => {
              const active = isActive(item.href)
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative inline-flex flex-col items-center gap-1 py-1 text-[12.5px] transition-colors duration-200 ${
                      active
                        ? 'text-[var(--color-fg1)] font-semibold'
                        : 'text-[var(--color-fg2)] hover:text-[var(--color-fg1)] font-medium'
                    } ${isRtl ? 'font-arabic-body' : 'font-display'}`}
                  >
                    {t(item.key)}
                    {active && (
                      <motion.span
                        layoutId="bottom-nav-active-dot"
                        aria-hidden
                        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                        className="block h-[3px] w-[3px] rounded-full bg-[var(--color-accent)]"
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Hamburger — scale + accent micro-rule on press */}
          <motion.button
            type="button"
            aria-label={t('menu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.18, ease: EASE_EDITORIAL }}
            className="group inline-flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] -me-1 transition-[border-color,background-color] duration-200 hover:border-[var(--color-border-strong)] active:bg-[var(--color-bg-deep)]"
          >
            <span aria-hidden className="block h-px w-4 bg-[var(--color-fg1)] transition-transform duration-200 group-hover:translate-y-[-1px]" />
            <span aria-hidden className="block h-px w-3 bg-[var(--color-accent)]" />
            <span aria-hidden className="block h-px w-4 bg-[var(--color-fg1)] transition-transform duration-200 group-hover:translate-y-[1px]" />
          </motion.button>
        </div>
      </nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} authSlot={mobileAuthSlot} />
    </>
  )
}
