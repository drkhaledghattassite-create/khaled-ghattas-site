import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { Noto_Naskh_Arabic, Instrument_Serif, Fraunces, Reem_Kufi } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers/Providers'
import { routing } from '@/lib/i18n/routing'
import { SITE_NAME } from '@/lib/constants'
import '../globals.css'

const arabic = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
})

const arabicDisplay = Reem_Kufi({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic-display',
  display: 'swap',
})

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const display = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT'],
  variable: '--font-display',
  display: 'swap',
})


export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description:
    'الموقع الرسمي للدكتور خالد غطاس — عالم بيولوجيا الخلايا وخبير في السلوك البشري، كاتب ومحاضر، مؤسس مبادرة الورشة.',
}

export const viewport: Viewport = {
  themeColor: '#EDE7DF',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()
  const t = await getTranslations({ locale, namespace: 'common' })
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${arabic.variable} ${arabicDisplay.variable} ${serif.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <body>
        <a href="#main-content" className="skip-link">
          {t('skip_to_content')}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
          <Toaster richColors closeButton position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
