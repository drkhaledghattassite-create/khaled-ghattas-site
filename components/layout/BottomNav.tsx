'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { MobileMenu } from './MobileMenu'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { n: '01', key: 'home', href: '/' },
  { n: '02', key: 'about', href: '/about' },
  { n: '03', key: 'articles', href: '/articles' },
  { n: '04', key: 'books', href: '/books' },
  { n: '05', key: 'gallery', href: '/gallery' },
] as const

export function BottomNav() {
  const locale = useLocale()
  const t = useTranslations('nav')
  const tCta = useTranslations('cta')
  const [visible, setVisible] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (y < 300) {
        setVisible(true)
      } else if (y > lastY.current + 8) {
        setVisible(false)
      } else if (y < lastY.current - 8) {
        setVisible(true)
      }
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <AnimatePresence>
        {!visible && !menuOpen && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.77, 0, 0.175, 1] }}
            className="fixed inset-x-0 top-[52px] z-40 mx-auto w-max"
          >
            <div className="font-label rounded-full border border-ink bg-cream-soft px-4 py-1 text-ink shadow-sm">
              {tCta('scroll_up_to_reveal_nav')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        aria-label={t('primary')}
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        animate={{ y: visible ? '0%' : '100%', opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-x-0 bottom-0 z-50 h-[41.7px] border-t border-ink/20 bg-cream"
      >
        <div className="container flex h-full items-center justify-between text-ink">
          <Link href="/" className="font-label text-[13px] leading-none">
            {t('brand')}
          </Link>

          <ul className="hidden items-center gap-4 md:flex">
            {NAV_ITEMS.map((item, i) => (
              <li key={item.key} className="flex items-center gap-4">
                <Link
                  href={item.href}
                  className="group inline-flex items-baseline gap-1.5"
                >
                  <span className="font-label text-[11px] text-ink-muted transition-colors group-hover:text-ink">
                    {item.n}.
                  </span>
                  <span className="font-serif italic text-[15px] transition-colors group-hover:text-ink">
                    {t(item.key)}
                  </span>
                </Link>
                {i < NAV_ITEMS.length - 1 && (
                  <span aria-hidden className="h-3 w-px bg-ink/30" />
                )}
              </li>
            ))}
          </ul>

          <button
            type="button"
            aria-label={t('menu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className={cn(
              'inline-flex h-7 w-7 flex-col items-center justify-center gap-[5px] md:hidden',
            )}
          >
            <span className="block h-px w-5 bg-ink" />
            <span className="block h-px w-5 bg-ink" />
            <span className="block h-px w-5 bg-ink" />
          </button>
        </div>
      </motion.nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
