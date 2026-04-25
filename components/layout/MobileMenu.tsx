'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { LogoLink } from '@/components/shared/Logo'
import { Ornament } from '@/components/shared/Ornament'
import { LocaleSwitcher } from './LocaleSwitcher'

const NAV_ITEMS = [
  { n: '01', key: 'about', href: '/about', image: '/placeholder/nav/nav-1.jpg' },
  { n: '02', key: 'articles', href: '/articles', image: '/placeholder/nav/nav-2.jpg' },
  { n: '03', key: 'interviews', href: '/interviews', image: '/placeholder/nav/nav-3.jpg' },
  { n: '04', key: 'store', href: '/books', image: '/placeholder/nav/nav-4.jpg' },
  { n: '05', key: 'gallery', href: '/gallery', image: '/placeholder/nav/nav-5.jpg' },
] as const

type Props = {
  open: boolean
  onClose: () => void
  authSlot?: ReactNode
}

export function MobileMenu({ open, onClose, authSlot }: Props) {
  const locale = useLocale()
  const t = useTranslations('nav')
  const isRtl = locale === 'ar'
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    // Initial focus on close button — predictable for AT users
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
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.55, ease: [0.77, 0, 0.175, 1] }}
          className="fixed inset-0 z-[60] flex flex-col bg-paper"
          role="dialog"
          aria-modal="true"
          aria-label={t('menu')}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(60% 50% at 80% 10%, rgba(168, 196, 214, 0.14) 0%, transparent 70%)',
            }}
          />

          <div className="relative flex items-center justify-between gap-3 px-6 py-5">
            <LogoLink href="/" onClick={onClose} alt={t('brand')} height={36} />
            <div className="flex items-center gap-2">
              <LocaleSwitcher />
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-ink/5 focus-visible:bg-ink/5"
              >
                <span aria-hidden className="relative block h-5 w-5">
                  <span className="absolute inset-x-0 top-1/2 block h-px -translate-y-1/2 rotate-45 bg-ink" />
                  <span className="absolute inset-x-0 top-1/2 block h-px -translate-y-1/2 -rotate-45 bg-ink" />
                </span>
              </button>
            </div>
          </div>

          <div className="relative px-6 pb-2 text-brass">
            <Ornament glyph="fleuron" size={16} />
          </div>

          <ul className="relative flex flex-1 flex-col justify-center gap-2 px-6">
            {NAV_ITEMS.map((item, i) => (
              <motion.li
                key={item.key}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.55,
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: 0.2 + i * 0.07,
                }}
                className="relative"
              >
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="group flex items-baseline justify-between gap-4 border-b border-ink/15 py-4"
                >
                  <div className="flex items-baseline gap-3">
                    <span
                      className="text-brass"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontStyle: 'italic',
                        fontWeight: 400,
                        fontSize: 14,
                      }}
                    >
                      .{item.n}
                    </span>
                    <span
                      className="text-ink transition-colors group-hover:text-brass-deep"
                      style={{
                        fontFamily: isRtl ? 'var(--font-arabic-display)' : 'var(--font-display)',
                        fontStyle: isRtl ? 'normal' : 'normal',
                        fontWeight: isRtl ? 500 : 400,
                        fontSize: isRtl ? 36 : 38,
                        lineHeight: 1.05,
                        letterSpacing: isRtl ? 0 : '-0.01em',
                      }}
                    >
                      {t(item.key)}
                    </span>
                  </div>
                  <span aria-hidden className="text-ink-muted/50 transition-colors group-hover:text-brass">
                    <Ornament glyph="arabesque" size={20} />
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>

          {authSlot && (
            <div
              className="relative flex items-center justify-center gap-2 px-6 pt-6 pb-12"
              onClick={onClose}
            >
              {authSlot}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
