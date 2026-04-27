import type { ReactNode } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { AuthAside } from '@/components/auth/AuthAside'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function AuthLayout({ children, params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <main
      id="main-content"
      className="min-h-dvh bg-[var(--color-bg)] grid md:grid-cols-[minmax(360px,520px)_1fr]"
    >
      <AuthAside />

      <div className="relative flex min-h-dvh items-center justify-center [padding:clamp(40px,6vw,80px)_clamp(20px,5vw,56px)]">
        {/* Top-right utilities */}
        <div className="absolute top-4 end-4 flex items-center gap-1.5">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[440px]">{children}</div>
      </div>
    </main>
  )
}
