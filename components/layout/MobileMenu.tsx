'use client'

import Image from 'next/image'
import { useEffect, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { LogoLink } from '@/components/shared/Logo'
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

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
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
          transition={{ duration: 0.5, ease: [0.77, 0, 0.175, 1] }}
          className="fixed inset-0 z-[60] flex flex-col bg-cream"
          role="dialog"
          aria-modal="true"
          aria-label={t('menu')}
        >
          <div className="flex items-center justify-between gap-3 px-6 py-5">
            <LogoLink href="/" onClick={onClose} alt={t('brand')} height={36} />
            <div className="flex items-center gap-2">
              <LocaleSwitcher />
              <button
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="inline-flex h-11 w-11 items-center justify-center text-ink"
              >
                <span aria-hidden className="relative block h-5 w-5">
                  <span className="absolute inset-x-0 top-1/2 block h-px -translate-y-1/2 rotate-45 bg-ink" />
                  <span className="absolute inset-x-0 top-1/2 block h-px -translate-y-1/2 -rotate-45 bg-ink" />
                </span>
              </button>
            </div>
          </div>

          <ul className="flex flex-1 flex-col justify-center gap-3 px-6">
            {NAV_ITEMS.map((item, i) => {
              const tiltBase = i % 2 === 0 ? -8 : 8
              const tilt = isRtl ? -tiltBase : tiltBase
              return (
                <motion.li
                  key={item.key}
                  initial={{ y: 40, opacity: 0, rotate: 0 }}
                  animate={{ y: 0, opacity: 1, rotate: tilt }}
                  transition={{
                    duration: 0.5,
                    ease: [0.34, 1.56, 0.64, 1],
                    delay: 0.25 + i * 0.09,
                  }}
                  className="relative"
                >
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="group flex items-center gap-4"
                  >
                    <div className="dotted-outline relative h-16 w-16 shrink-0 overflow-hidden bg-cream-soft">
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-label text-ink-muted text-[12px]">
                        {item.n}.
                      </span>
                      <span
                        className="text-ink text-[36px] leading-none transition-colors group-hover:text-amber"
                        style={{
                          fontFamily: isRtl
                            ? 'var(--font-arabic)'
                            : 'var(--font-serif)',
                          fontStyle: isRtl ? 'normal' : 'italic',
                        }}
                      >
                        {t(item.key)}
                      </span>
                    </div>
                  </Link>
                </motion.li>
              )
            })}
          </ul>

          {authSlot && (
            <div
              className="flex items-center justify-center gap-2 px-6 pt-6 pb-12"
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
