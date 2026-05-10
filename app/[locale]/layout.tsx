import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { IBM_Plex_Sans_Arabic, Readex_Pro, Inter } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers/Providers'
import { AppLoader } from '@/components/layout/AppLoader'
import { MaintenanceBanner } from '@/components/layout/MaintenanceBanner'
import { ViewTransitionsRouter } from '@/components/motion/ViewTransitionsRouter'
import { ProximityPrefetch } from '@/components/motion/ProximityPrefetch'
import { SectionBackgroundCrossfade } from '@/components/motion/SectionBackgroundCrossfade'
import { OrganizationJsonLd, WebsiteJsonLd } from '@/components/seo/StructuredData'
import { routing } from '@/lib/i18n/routing'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import '../globals.css'

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
})

const arabicDisplay = Readex_Pro({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-arabic-display',
  display: 'swap',
})

const display = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})


type LocaleParams = { params: Promise<{ locale: string }> }

const SITE_NAME_AR = 'د. خالد غطاس'

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  const isAr = locale === 'ar'

  const title = isAr ? SITE_NAME_AR : SITE_NAME
  const description = isAr
    ? 'الموقع الرسمي للدكتور خالد غطاس — عالم بيولوجيا الخلايا وخبير في السلوك البشري، كاتب ومحاضر، مؤسس مبادرة الورشة.'
    : 'The official site of Dr. Khaled Ghattass — cell biologist, expert in human behavior, author, speaker, founder of Al-Warsheh.'

  const canonical = isAr ? SITE_URL : `${SITE_URL}/en`

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: isAr ? `%s — ${SITE_NAME_AR}` : `%s — ${SITE_NAME}`,
    },
    description,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    alternates: {
      canonical,
      languages: {
        ar: SITE_URL,
        en: `${SITE_URL}/en`,
        'x-default': SITE_URL,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: SITE_NAME }],
      locale: isAr ? 'ar_LB' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/opengraph-image'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
    },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EDE7DF' },
    { media: '(prefers-color-scheme: dark)', color: '#252321' },
  ],
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
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
  const settings = await getCachedSiteSettings()
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  const maintenanceMessage =
    locale === 'ar'
      ? settings.maintenance.message_ar
      : settings.maintenance.message_en

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${arabic.variable} ${arabicDisplay.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className={settings.features.maintenance_mode ? 'has-maintenance' : undefined}
      >
        <a href="#main-content" className="skip-link">
          {t('skip_to_content')}
        </a>
        <WebsiteJsonLd locale={locale} />
        <OrganizationJsonLd locale={locale} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {settings.features.maintenance_mode && (
            <MaintenanceBanner
              message={maintenanceMessage}
              until={settings.maintenance.until}
            />
          )}
          <Providers>{children}</Providers>
          <ViewTransitionsRouter />
          <ProximityPrefetch />
          <SectionBackgroundCrossfade />
          <AppLoader />
          <Toaster richColors closeButton position="top-center" />
        </NextIntlClientProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
