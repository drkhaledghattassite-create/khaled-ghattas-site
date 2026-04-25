'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { MobileMenu } from './MobileMenu'
import { LogoLink } from '@/components/shared/Logo'
import { Ornament } from '@/components/shared/Ornament'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { n: '01', key: 'home', href: '/' },
  { n: '02', key: 'about', href: '/about' },
  { n: '03', key: 'articles', href: '/articles' },
  { n: '04', key: 'store', href: '/books' },
  { n: '05', key: 'gallery', href: '/gallery' },
] as const

export function BottomNav({ mobileAuthSlot }: { mobileAuthSlot?: ReactNode }) {
  const locale = useLocale()
  const t = useTranslations('nav')
  const tCta = useTranslations('cta')
  const isRtl = locale === 'ar'
  const [visible, setVisible] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (y < 300) setVisible(true)
      else if (y > lastY.current + 8) setVisible(false)
      else if (y < lastY.current - 8) setVisible(true)
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
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.77, 0, 0.175, 1] }}
            className="fixed inset-x-0 top-[56px] z-40 mx-auto w-max"
          >
            <div
              className="rounded-full border border-ink/30 bg-paper-soft px-4 py-1.5 text-ink shadow-[0_4px_20px_-12px_rgba(31,24,18,0.25)]"
              style={{
                fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
                fontStyle: isRtl ? 'normal' : 'italic',
                fontSize: isRtl ? 13 : 11.5,
                letterSpacing: isRtl ? 0 : '0.04em',
              }}
            >
              <Ornament glyph="fleuron" size={11} className="text-brass me-2 align-baseline" />
              {tCta('scroll_up_to_reveal_nav')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        aria-label={t('primary')}
        dir={isRtl ? 'rtl' : 'ltr'}
        animate={{ y: visible ? '0%' : '100%', opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-x-0 bottom-0 z-50 h-[64px] border-t border-ink/15 bg-paper/92 backdrop-blur-md md:h-[58px]"
        style={{
          boxShadow: '0 -10px 30px -16px rgba(31, 24, 18, 0.20)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
        }}
      >
        <div className="container flex h-full items-center justify-between text-ink">
          <LogoLink href="/" alt={t('brand')} height={36} />

          <ul className="hidden items-center md:flex">
            {NAV_ITEMS.map((item, i) => (
              <li key={item.key} className="flex items-center">
                <Link
                  href={item.href}
                  className="group inline-flex items-baseline gap-2 px-4 py-2"
                >
                  <span
                    className="text-ink-muted transition-colors group-hover:text-brass"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontWeight: 400,
                      fontSize: 12,
                      letterSpacing: '0.04em',
                    }}
                  >
                    .{item.n}
                  </span>
                  <span
                    className="text-ink transition-colors group-hover:text-brass"
                    style={{
                      fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
                      fontWeight: isRtl ? 600 : 500,
                      fontSize: isRtl ? 16 : 14.5,
                      letterSpacing: isRtl ? 0 : 0,
                    }}
                  >
                    {t(item.key)}
                  </span>
                </Link>
                {i < NAV_ITEMS.length - 1 && (
                  <span aria-hidden className="text-ink-muted/45">
                    <Ornament glyph="asterism" size={10} />
                  </span>
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
              '-me-2 inline-flex h-11 w-11 flex-col items-center justify-center gap-[5px] md:hidden',
            )}
          >
            <span className="block h-px w-5 bg-ink" />
            <span className="block h-px w-3 bg-brass" />
            <span className="block h-px w-5 bg-ink" />
          </button>
        </div>
      </motion.nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} authSlot={mobileAuthSlot} />
    </>
  )
}
