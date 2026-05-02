import type { ReactNode } from 'react'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { AuthAside } from '@/components/auth/AuthAside'
import { Link } from '@/lib/i18n/navigation'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Logo } from '@/components/shared/Logo'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function AuthLayout({ children, params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const tNav = await getTranslations({ locale, namespace: 'nav' })
  const isRtl = locale === 'ar'

  return (
    <main
      id="main-content"
      className="min-h-dvh bg-[var(--color-bg)] grid md:grid-cols-[minmax(320px,460px)_1fr]"
    >
      <AuthAside />

      {/* flex-col + justify-center centers the form vertically on every
          breakpoint, so the empty space is split evenly above/below
          instead of dumped at the bottom. items-center keeps the form's
          max-w-[440px] container horizontally centered. */}
      <div className="relative flex min-h-dvh flex-col items-center justify-center [padding:clamp(72px,8vw,96px)_clamp(20px,5vw,56px)_clamp(28px,5vw,40px)]">
        {/* Top bar — back link on the start, locale + theme on the end.
            44×44 touch targets so taps are reliable on mobile. */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-[var(--color-fg2)] hover:text-[var(--color-fg1)] transition-colors ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            <span aria-hidden>{isRtl ? '→' : '←'}</span>
            {tNav('home')}
          </Link>
          <div className="flex items-center gap-1.5">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex w-full max-w-[440px] flex-col items-stretch gap-6">
          {/* Mobile-only brand mark — gives the page identity now that the
              aside is hidden on small screens. Hidden at md+ since the
              aside provides this context on the side. */}
          <div className="md:hidden flex justify-center">
            <Logo height={28} alt={tNav('brand')} />
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}
