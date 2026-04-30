import type { ReactNode } from 'react'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { AuthAside } from '@/components/auth/AuthAside'
import { Link } from '@/lib/i18n/navigation'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

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

      <div className="relative flex min-h-dvh items-start md:items-center justify-center [padding:clamp(56px,5vw,64px)_clamp(20px,5vw,56px)_clamp(20px,3vw,32px)]">
        {/* Top bar — back link on the start, locale + theme on the end */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-fg2)] hover:text-[var(--color-fg1)] transition-colors ${
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

        <div className="w-full max-w-[440px]">{children}</div>
      </div>
    </main>
  )
}
