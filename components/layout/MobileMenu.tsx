'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link, usePathname } from '@/lib/i18n/navigation'
import { LogoLink } from '@/components/shared/Logo'
import { LocaleSwitcher } from './LocaleSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { staggerContainer, staggerItem, EASE_EDITORIAL } from '@/lib/motion/variants'
import type { NavItem } from './SiteHeader'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { key: 'home', href: '/' },
  { key: 'about', href: '/about' },
  { key: 'store', href: '/books' },
  { key: 'articles', href: '/articles' },
  { key: 'interviews', href: '/interviews' },
  { key: 'events', href: '/events' },
  { key: 'corporate', href: '/corporate' },
  { key: 'booking', href: '/booking' },
  { key: 'contact', href: '/contact' },
]

type Props = {
  open: boolean
  onClose: () => void
  authSlot?: ReactNode
  navItems?: NavItem[]
  showLocaleSwitcher?: boolean
}

export function MobileMenu({
  open,
  onClose,
  authSlot,
  navItems = DEFAULT_NAV_ITEMS,
  showLocaleSwitcher = true,
}: Props) {
  const t = useTranslations('nav')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const reduceMotion = useReducedMotion()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  // Lock scroll + remember the trigger so we can restore focus on close.
  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 60)
    return () => {
      window.clearTimeout(id)
      document.body.style.overflow = ''
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  // Focus trap + Esc-to-close. Tab from last focusable wraps to first;
  // Shift+Tab from first wraps to last. Keeps keyboard users inside the
  // dialog while it's open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      // Active focus may be outside the panel (e.g. body) — treat that
      // as "first" so Tab pulls focus into the dialog.
      if (e.shiftKey) {
        if (!active || active === first || !panel.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Drawer slides from end side (RTL-aware): negative x = comes from right in LTR / left in RTL.
  const panelOffset = isRtl ? '-100%' : '100%'
  const panelTransition = reduceMotion
    ? { duration: 0.18, ease: EASE_EDITORIAL }
    : { type: 'spring' as const, stiffness: 280, damping: 32, mass: 1 }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t('menu')}
          dir={isRtl ? 'rtl' : 'ltr'}
          className="fixed inset-0 z-[60]"
        >
          {/* Backdrop — tap-outside-to-close */}
          <motion.button
            type="button"
            aria-label={t('close')}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_EDITORIAL }}
            className="absolute inset-0 cursor-default bg-[var(--color-bg)]/[0.55] backdrop-blur-xl backdrop-saturate-[1.2] supports-[backdrop-filter]:bg-[var(--color-bg)]/[0.4]"
          />

          {/* Drawer panel */}
          <motion.aside
            ref={panelRef}
            id="mobile-menu-panel"
            initial={{ x: panelOffset, opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: panelOffset, opacity: 0, transition: { duration: 0.28, ease: EASE_EDITORIAL } }}
            transition={panelTransition}
            className="absolute inset-y-0 end-0 flex h-full w-[min(420px,88vw)] flex-col border-s border-[var(--color-border)] bg-[var(--color-bg)] shadow-[-24px_0_60px_-30px_rgba(0,0,0,0.25)] dark:shadow-[-24px_0_60px_-30px_rgba(0,0,0,0.6)]"
          >
            {/* Header strip */}
            <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4">
              <LogoLink href="/" onClick={onClose} alt={t('brand')} height={26} />
              <div className="flex items-center gap-2">
                {showLocaleSwitcher && <LocaleSwitcher />}
                <ThemeToggle />
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onClose}
                  aria-label={t('close')}
                  className="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-fg2)] transition-[transform,color,border-color] duration-200 hover:text-[var(--color-fg1)] hover:border-[var(--color-border-strong)] active:scale-95"
                >
                  <span aria-hidden className="relative block h-3.5 w-3.5">
                    <motion.span
                      initial={{ rotate: 0, scaleX: 0 }}
                      animate={{ rotate: 45, scaleX: 1 }}
                      transition={{ duration: 0.32, ease: EASE_EDITORIAL, delay: 0.06 }}
                      className="absolute inset-x-0 top-1/2 block h-px -translate-y-1/2 bg-current"
                    />
                    <motion.span
                      initial={{ rotate: 0, scaleX: 0 }}
                      animate={{ rotate: -45, scaleX: 1 }}
                      transition={{ duration: 0.32, ease: EASE_EDITORIAL, delay: 0.06 }}
                      className="absolute inset-x-0 top-1/2 block h-px -translate-y-1/2 bg-current"
                    />
                  </span>
                </button>
              </div>
            </div>

            {/* Accent rule beneath logo strip */}
            <motion.span
              aria-hidden
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE_EDITORIAL, delay: 0.12 }}
              className="mx-6 mb-2 block h-[2px] w-10 origin-[var(--tw-origin,start)] bg-[var(--color-accent)]"
              style={{ transformOrigin: isRtl ? 'right' : 'left' }}
            />
            <div aria-hidden className="mx-6 h-px bg-[var(--color-border)] mt-2" />

            {/* Nav items — stagger reveal, gated under reduced-motion. */}
            <motion.ul
              variants={reduceMotion ? undefined : staggerContainer}
              initial={reduceMotion ? false : 'hidden'}
              animate={reduceMotion ? undefined : 'visible'}
              className="flex flex-col gap-1 px-6 pt-6 list-none m-0 flex-1 overflow-y-auto"
            >
              {navItems.map((item) => {
                const active = isActive(item.href)
                return (
                  <motion.li key={item.key} variants={reduceMotion ? undefined : staggerItem}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className="group relative flex items-center justify-between gap-4 py-4 transition-transform duration-200 hover:translate-x-1 rtl:hover:-translate-x-1"
                    >
                      <span
                        className={`relative inline-block text-[26px] leading-[1.15] font-bold tracking-tight transition-colors duration-200 ${
                          active
                            ? 'text-[var(--color-accent)]'
                            : 'text-[var(--color-fg1)] group-hover:text-[var(--color-accent)]'
                        } ${isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.02em]'}`}
                      >
                        {t(item.key)}
                        <span
                          aria-hidden
                          className={`pointer-events-none absolute inset-x-0 -bottom-1 block h-[2px] origin-[var(--tw-origin,start)] bg-[var(--color-accent)] transition-transform duration-300 ${
                            active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                          }`}
                          style={{ transformOrigin: isRtl ? 'right' : 'left' }}
                        />
                      </span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden
                        className={`flex-shrink-0 transition-colors duration-200 ${
                          active
                            ? 'text-[var(--color-accent)]'
                            : 'text-[var(--color-fg3)] group-hover:text-[var(--color-accent)]'
                        }`}
                        style={{ transform: isRtl ? 'scaleX(-1)' : undefined }}
                      >
                        <path
                          d="M4 10h12M10 4l6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                    <span aria-hidden className="block h-px bg-[var(--color-border)]" />
                  </motion.li>
                )
              })}
            </motion.ul>

            {/* Auth slot — full-width primary at the bottom (reveal gated).
                Click-handling uses event delegation: tapping a link inside
                (Sign in / Account / Admin) closes the drawer, but tapping a
                button (the user-menu dropdown trigger) does NOT — otherwise
                the drawer would unmount before the dropdown could render. */}
            {authSlot && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={reduceMotion ? undefined : { duration: 0.5, ease: EASE_EDITORIAL, delay: 0.32 }}
                className="px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-6"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a[href]')) onClose()
                }}
              >
                {authSlot}
              </motion.div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
