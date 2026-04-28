import type { Metadata } from 'next'
import { Mail, MapPin, Phone } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InnerHero } from '@/components/shared/InnerHero'
import { ContactForm } from '@/components/forms/ContactForm'
import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
  YouTubeIcon,
} from '@/components/shared/social-icons'
import { pageMetadata } from '@/lib/seo/page-metadata'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contact.meta' })
  return pageMetadata({
    locale,
    path: '/contact',
    title: t('title'),
    description: t('description'),
  })
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('contact')
  const isRtl = locale === 'ar'

  const socialLinks = [
    { label: 'Twitter', href: 'https://twitter.com', Icon: TwitterIcon },
    { label: 'Facebook', href: 'https://facebook.com', Icon: FacebookIcon },
    { label: 'YouTube', href: 'https://youtube.com', Icon: YouTubeIcon },
    { label: 'Instagram', href: 'https://instagram.com', Icon: InstagramIcon },
  ] as const

  return (
    <>
      <InnerHero
        eyebrow={t('page.eyebrow')}
        headingItalic={t('page.hero.italic')}
        headingSans={t('page.hero.sans')}
        description={t('page.description')}
        folio={t('page.folio')}
      />

      <section
        dir={isRtl ? 'rtl' : 'ltr'}
        className="border-b border-[var(--color-border)] [padding:clamp(64px,8vw,112px)_clamp(20px,5vw,56px)]"
      >
        <div className="mx-auto max-w-[var(--container-max)] grid gap-[clamp(40px,5vw,80px)] md:grid-cols-[1.3fr_1fr]">
          <div className="rounded-[4px] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] [padding:clamp(28px,4vw,48px)]">
            <header className="grid items-end gap-2 mb-8">
              <span className="section-eyebrow">{t('page.form_eyebrow')}</span>
              <h2
                className={`m-0 text-[clamp(22px,2.4vw,28px)] leading-[1.2] font-bold text-[var(--color-fg1)] tracking-[-0.005em] ${
                  isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.02em]'
                }`}
              >
                {t('page.form_heading')}
              </h2>
            </header>
            <ContactForm />
          </div>

          <aside className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className="section-eyebrow">{t('info.heading')}</span>
              <p
                className={`m-0 text-[15px] leading-[1.65] text-[var(--color-fg2)] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('info.description')}
              </p>
            </div>

            <ul className="m-0 p-0 list-none flex flex-col gap-3 pt-6 border-t border-[var(--color-border)]">
              <li className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                  <Mail className="h-4 w-4" aria-hidden />
                </span>
                <a
                  href={`mailto:${t('info.email')}`}
                  className={`text-[14px] font-semibold text-[var(--color-fg1)] hover:text-[var(--color-accent)] transition-colors ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('info.email')}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                  <Phone className="h-4 w-4" aria-hidden />
                </span>
                <span
                  className={`text-[14px] font-semibold text-[var(--color-fg1)] [font-feature-settings:"tnum"] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('info.phone')}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                  <MapPin className="h-4 w-4" aria-hidden />
                </span>
                <span
                  className={`text-[14px] font-medium text-[var(--color-fg2)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('info.location')}
                </span>
              </li>
            </ul>

            <div className="pt-6 border-t border-[var(--color-border)]">
              <h3
                className={`m-0 mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] ${
                  isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
                }`}
              >
                {t('info.social')}
              </h3>
              <ul className="m-0 p-0 list-none flex flex-wrap gap-2">
                {socialLinks.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[var(--color-fg2)] transition-colors duration-200 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-fg)]"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[4px] border-s-[3px] border-[var(--color-accent)] bg-[var(--color-bg-elevated)] p-5">
              <p
                className={`m-0 mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)] ${
                  isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
                }`}
              >
                {t('info.speaking_label')}
              </p>
              <p
                className={`m-0 text-[14px] leading-[1.6] text-[var(--color-fg2)] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('info.speaking_text')}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
