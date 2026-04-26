'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { LogoLink } from '@/components/shared/Logo'
import { LocaleSwitcher } from './LocaleSwitcher'
import { ThemeToggle } from './ThemeToggle'

const NAV_ITEMS = [
  { key: 'home', href: '/' },
  { key: 'about', href: '/about' },
  { key: 'articles', href: '/articles' },
  { key: 'interviews', href: '/interviews' },
  { key: 'store', href: '/books' },
  { key: 'gallery', href: '/gallery' },
  { key: 'contact', href: '/contact' },
] as const

type Props = {
  open: boolean
  onClose: () => void
  authSlot?: ReactNode
}

export function MobileMenu({ open, onClose, authSlot }: Props) {
  const t = useTranslations('nav')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 50)
    return () => {
      window.clearTimeout(id)
      document.body.style.overflow = ''
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[60] bg-[var(--color-bg)]"
          role="dialog"
          aria-modal="true"
          aria-label={t('menu')}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Header strip */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--color-border)]">
            <LogoLink href="/" onClick={onClose} alt={t('brand')} height={28} />
            <div className="flex items-center gap-2">
              <LocaleSwitcher />
              <ThemeToggle />
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-fg2)] hover:text-[var(--color-fg1)]"
              >
                <span aria-hidden className="relative block h-4 w-4">
                  <span className="absolute inset-x-0 top-1/2 block h-px -translate-y-1/2 rotate-45 bg-current" />
                  <span className="absolute inset-x-0 top-1/2 block h-px -translate-y-1/2 -rotate-45 bg-current" />
                </span>
              </button>
            </div>
          </div>

          {/* Nav items */}
          <ul className="flex flex-col px-5 pt-4 list-none m-0">
            {NAV_ITEMS.map((item, i) => (
              <motion.li
                key={item.key}
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.04 + i * 0.04 }}
              >
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center justify-between border-b border-[var(--color-border)] py-5 group"
                >
                  <span
                    className={`text-[28px] leading-tight font-bold tracking-tight text-[var(--color-fg1)] group-hover:text-[var(--color-accent)] transition-colors ${
                      isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.02em]'
                    }`}
                  >
                    {t(item.key)}
                  </span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden
                    className="text-[var(--color-fg3)] group-hover:text-[var(--color-accent)] transition-colors flex-shrink-0"
                    style={{ transform: isRtl ? 'scaleX(-1)' : undefined }}
                  >
                    <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </motion.li>
            ))}
          </ul>

          {authSlot && (
            <div className="flex items-center justify-center gap-2 px-5 pt-8" onClick={onClose}>
              {authSlot}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
