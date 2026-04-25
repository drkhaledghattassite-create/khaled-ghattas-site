'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { resolvePageLabel, stripLocale } from '@/lib/page-labels'
import { LOCALES } from '@/lib/constants'
import { cn } from '@/lib/utils'

const SECTION_COUNT = 6

export function SiteHeader() {
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

  const pillLabel = isHome ? t('page_index') : t('page_index_numbered', { n: label })

  return (
    <header
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-x-0 top-0 z-50 h-[43px] bg-cream/85 backdrop-blur-sm"
    >
      <div className="container flex h-full items-center justify-between">
        <ul className="flex items-center gap-2" aria-label={t('progress')}>
          {Array.from({ length: SECTION_COUNT }).map((_, i) => {
            const isFilled = i < scrollActive
            const isActive = i === scrollActive
            return (
              <li key={i} className="flex items-center gap-2">
                <span
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'block h-2 w-2 rounded-full border border-ink transition-colors duration-200',
                    isFilled && 'bg-ink',
                    isActive && 'bg-ink',
                  )}
                />
                {i < SECTION_COUNT - 1 && (
                  <span className="block h-px w-6 bg-ink/40" aria-hidden />
                )}
              </li>
            )
          })}
        </ul>

        <div className="font-label inline-flex items-center gap-2 rounded-full border border-ink px-4 py-1 text-ink transition-colors duration-200 hover:bg-ink hover:text-cream-soft">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink" />
          {pillLabel}
        </div>
      </div>
    </header>
  )
}
