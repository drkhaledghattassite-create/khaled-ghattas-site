'use client'

import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import { MobileMenu } from './MobileMenu'

const QUICK_LINKS = [
  { key: 'about', href: '/about' },
  { key: 'articles', href: '/articles' },
  { key: 'store', href: '/books' },
] as const

export function BottomNav({ mobileAuthSlot }: { mobileAuthSlot?: ReactNode }) {
  const locale = useLocale()
  const t = useTranslations('nav')
  const isRtl = locale === 'ar'
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav
        aria-label={t('primary')}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-bg)]/[0.95] backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
      >
        <div className="mx-auto max-w-[var(--container-max)] flex items-center justify-between gap-2 px-5 h-[56px]">
          <ul className="flex items-center gap-5 list-none m-0 p-0">
            {QUICK_LINKS.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={`text-[12.5px] font-medium text-[var(--color-fg2)] hover:text-[var(--color-fg1)] transition-colors ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>

          <button
            type="button"
            aria-label={t('menu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] -me-1"
          >
            <span aria-hidden className="block h-px w-4 bg-[var(--color-fg1)]" />
            <span aria-hidden className="block h-px w-3 bg-[var(--color-accent)]" />
            <span aria-hidden className="block h-px w-4 bg-[var(--color-fg1)]" />
          </button>
        </div>
      </nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} authSlot={mobileAuthSlot} />
    </>
  )
}
