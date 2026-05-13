import type { ReactNode } from 'react'
import { setRequestLocale } from 'next-intl/server'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

/**
 * (focus) route group — minimal layout for full-screen, distraction-free
 * surfaces. The take page (/tests/[slug]/take) renders its own custom
 * chrome (mark + test title + Exit) and intentionally OMITS the public
 * SiteHeader / SiteFooter so the user stays focused on one question at a
 * time. The MaintenanceBanner from the locale layout still shows above.
 */
export default async function FocusLayout({ children, params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-[var(--color-bg)] focus:outline-none">
      {children}
    </main>
  )
}
