'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import { LogoLink } from '@/components/shared/Logo'

/**
 * AuthAside — editorial side panel for /login and /register pages.
 * Sits next to the form on desktop, stacks above on mobile.
 */
export function AuthAside() {
  const t = useTranslations('auth.aside')
  const tNav = useTranslations('nav')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  return (
    <aside
      dir={isRtl ? 'rtl' : 'ltr'}
      className="relative flex flex-col justify-between overflow-hidden bg-[var(--color-bg-elevated)] border-[var(--color-border)] md:border-e [padding:clamp(40px,5vw,64px)_clamp(28px,5vw,56px)] min-h-[280px] md:min-h-dvh"
    >
      {/* Mark */}
      <div className="flex items-center gap-3">
        <LogoLink href="/" alt={tNav('brand')} height={26} />
        <span
          className={`text-[14px] font-bold text-[var(--color-fg1)] hidden sm:inline ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.01em]'
          }`}
        >
          {tNav('brand')}
        </span>
      </div>

      {/* Quote block — center */}
      <div className="my-[clamp(40px,6vw,80px)]">
        <span
          aria-hidden
          className="block w-10 h-[3px] bg-[var(--color-accent)] mb-7"
        />
        <span
          className={`block mb-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)] ${
            isRtl ? 'font-arabic-body !text-[14px] !tracking-normal !normal-case !font-bold' : 'font-display'
          }`}
        >
          {t('eyebrow')}
        </span>
        <blockquote className="m-0">
          <p
            className={`m-0 max-w-[420px] text-[clamp(22px,2.6vw,32px)] leading-[1.4] font-medium tracking-[-0.005em] text-[var(--color-fg1)] [text-wrap:pretty] ${
              isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.018em]'
            }`}
          >
            {t('quote')}
          </p>
          <footer
            className={`mt-5 inline-flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] before:content-[''] before:w-6 before:h-px before:bg-[var(--color-border-strong)] before:inline-block ${
              isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
            }`}
          >
            {t('attribution')}
          </footer>
        </blockquote>
      </div>

      {/* Subline */}
      <p
        className={`m-0 max-w-[380px] text-[14px] leading-[1.6] text-[var(--color-fg2)] ${
          isRtl ? 'font-arabic-body' : 'font-display'
        }`}
      >
        {t('subline')}
      </p>

      {/* Quiet back link */}
      <div className="mt-[clamp(24px,4vw,40px)]">
        <Link
          href="/"
          className={`inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--color-fg2)] hover:text-[var(--color-fg1)] transition-colors ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          <span aria-hidden>{isRtl ? '→' : '←'}</span>
          {tNav('home')}
        </Link>
      </div>
    </aside>
  )
}
