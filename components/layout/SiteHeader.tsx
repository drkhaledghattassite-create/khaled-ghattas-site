'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { resolvePageLabel, stripLocale } from '@/lib/page-labels'
import { LOCALES } from '@/lib/constants'
import { Ornament } from '@/components/shared/Ornament'
import { cn } from '@/lib/utils'
import { LocaleSwitcher } from './LocaleSwitcher'
import { ThemeToggle } from './ThemeToggle'

const SECTION_COUNT = 6

export function SiteHeader({ authSlot }: { authSlot?: ReactNode }) {
  const locale = useLocale()
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [scrollActive, setScrollActive] = useState(0)

  const normalized = stripLocale(pathname, LOCALES)
  const { label, activeDot } = resolvePageLabel(normalized)
  const isHome = label === 'index'

  useEffect(() => {
    if (!isHome) {
      setScrollActive(activeDot)
      return
    }
    const update = () => {
      const doc = document.documentElement
      const max = Math.max(doc.scrollHeight - doc.clientHeight, 1)
      const progress = Math.min(window.scrollY / max, 1)
      const idx = Math.min(Math.floor(progress * SECTION_COUNT), SECTION_COUNT - 1)
      setScrollActive(idx)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [isHome, activeDot])

  const isRtl = locale === 'ar'
  const pillLabel = isHome ? t('page_index') : t('page_index_numbered', { n: label })

  return (
    <header
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-x-0 top-0 z-50 h-[52px] border-b border-ink/10 bg-paper/80 backdrop-blur-md"
    >
      <div className="container flex h-full items-center justify-between gap-3">
        {/* Chapter ribbon — discrete fold marks instead of stacked dashes */}
        <ul className="hidden items-center gap-1.5 md:flex" aria-label={t('progress')}>
          <li className="me-1 text-brass">
            <Ornament glyph="fleuron" size={13} />
          </li>
          {Array.from({ length: SECTION_COUNT }).map((_, i) => {
            const isFilled = i < scrollActive
            const isActive = i === scrollActive
            return (
              <li key={i} className="flex items-center gap-1.5">
                <span
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'block h-[7px] w-[7px] rounded-full border border-ink/60 transition-colors duration-300',
                    isFilled && 'bg-ink',
                    isActive && 'bg-brass border-brass',
                  )}
                />
                {i < SECTION_COUNT - 1 && (
                  <span className="block h-px w-5 bg-ink/30" aria-hidden />
                )}
              </li>
            )
          })}
        </ul>

        <div className="flex items-center gap-2">
          <div
            className="hidden items-center gap-2 rounded-full border border-ink px-3.5 py-1 transition-colors duration-200 hover:bg-ink hover:text-paper-soft md:inline-flex font-display italic font-normal text-[12px] tracking-[0.04em] [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:font-semibold [dir=rtl]:tracking-normal"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brass" />
            {pillLabel}
          </div>
          <LocaleSwitcher />
          <ThemeToggle />
          {authSlot && <div className="hidden md:flex">{authSlot}</div>}
        </div>
      </div>
    </header>
  )
}
