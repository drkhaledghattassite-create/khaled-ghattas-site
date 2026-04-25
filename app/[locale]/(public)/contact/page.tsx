import type { Metadata } from 'next'
import { Mail, MapPin } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InnerHero } from '@/components/shared/InnerHero'
import { ContactForm } from '@/components/forms/ContactForm'
import { NewsletterSignup } from '@/components/sections/NewsletterSignup'
import { FacebookIcon, InstagramIcon, TwitterIcon, YouTubeIcon } from '@/components/shared/social-icons'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contact.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('contact')

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
      />

      <section className="relative z-[2] bg-cream px-[var(--spacing-md)] py-[var(--spacing-xl)]">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-[var(--spacing-xl)] md:grid-cols-[1.2fr_1fr]">
          <div>
            <ContactForm />
          </div>

          <aside className="flex flex-col gap-[var(--spacing-md)]">
            <div className="flex flex-col gap-3">
              <h2
                className="uppercase text-ink"
                style={{
                  fontFamily: locale === 'ar' ? 'var(--font-arabic)' : 'var(--font-oswald)',
                  fontWeight: locale === 'ar' ? 700 : 600,
                  fontSize: 24,
                  letterSpacing: locale === 'ar' ? 'normal' : '-0.5px',
                }}
              >
                {t('info.heading')}
              </h2>
              <p className="text-[14px] text-ink-muted">{t('info.description')}</p>
            </div>

            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-ink text-ink">
                  <Mail className="h-4 w-4" aria-hidden />
                </span>
                <a
                  href={`mailto:${t('info.email')}`}
                  className="text-[14px] text-ink transition-colors hover:text-amber"
                >
                  {t('info.email')}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-ink text-ink">
                  <MapPin className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-[14px] text-ink">{t('info.location')}</span>
              </li>
            </ul>

            <div>
              <h3 className="font-label mb-3 text-[11px] text-ink-muted">{t('info.social')}</h3>
              <ul className="flex flex-wrap gap-2">
                {socialLinks.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-ink text-ink transition-colors duration-300 hover:bg-ink hover:text-cream-soft"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto rounded-lg border border-dashed border-ink/50 p-5">
              <p className="font-label text-[11px] text-amber">{t('info.speaking_label')}</p>
              <p className="mt-2 text-[14px] text-ink">{t('info.speaking_text')}</p>
            </div>
          </aside>
        </div>

        <div className="mx-auto mt-[var(--spacing-xl)] max-w-[1200px]">
          <NewsletterSignup />
        </div>
      </section>
    </>
  )
}
