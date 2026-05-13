'use client'

import { useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('error')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  useEffect(() => {
    console.error('[error.tsx]', error)
  }, [error])

  const isDev = process.env.NODE_ENV !== 'production'

  return (
    <main
      id="main-content"
      tabIndex={-1}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="relative flex min-h-screen items-center justify-center px-[var(--section-pad-x)] py-[var(--section-pad-y)] focus:outline-none"
    >
      <div className="container mx-auto max-w-3xl text-center">
        <p className="section-eyebrow mx-auto mb-8 justify-center">{t('eyebrow')}</p>

        <p
          aria-hidden
          className="font-arabic-display select-none text-[clamp(120px,28vw,300px)] leading-none tracking-tight text-fg1/95"
        >
          500
        </p>

        <h1
          className={`section-title mt-6 ${
            isRtl ? 'font-arabic-display' : ''
          }`}
        >
          {t('heading')}
        </h1>

        <p
          className={`mx-auto mt-6 max-w-xl text-base leading-relaxed text-fg2 ${
            isRtl ? 'font-arabic-body !text-[17px] !leading-[1.8]' : 'font-display'
          }`}
        >
          {t('description')}
        </p>

        {isDev && error?.message ? (
          <details className="mt-8 inline-block max-w-full text-start text-sm">
            <summary
              className={`cursor-pointer text-fg3 hover:text-fg1 ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {t('details_label')}
            </summary>
            <pre className="mt-3 whitespace-pre-wrap break-words rounded-md border border-border bg-bg-deep p-3 text-xs text-fg2 text-start">
              {error.message}
              {error.digest ? `\n\ndigest: ${error.digest}` : ''}
            </pre>
          </details>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => reset()} className="btn-pill btn-pill-primary">
            {t('try_again')}
          </button>
          <Link href="/" className="btn-pill btn-pill-secondary">
            {t('back_home')}
          </Link>
        </div>
      </div>
    </main>
  )
}
