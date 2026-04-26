import type { Metadata } from 'next'
import { Mail, MapPin, Phone } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InnerHero } from '@/components/shared/InnerHero'
import { ContactForm } from '@/components/forms/ContactForm'
import { NewsletterSignup } from '@/components/sections/NewsletterSignup'
import { Ornament } from '@/components/shared/Ornament'
import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
  YouTubeIcon,
} from '@/components/shared/social-icons'

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
        chapterNumber=".09"
      />

      <section className="relative z-[2] bg-paper px-[var(--section-pad-x)] py-[var(--section-pad-y)]">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-[var(--spacing-xl)] md:grid-cols-[1.3fr_1fr]">
          <div className="paper-card p-7 md:p-10">
            <ContactForm />
          </div>

          <aside className="flex flex-col gap-[var(--spacing-md)]">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-3 text-ink-muted">
                <Ornament glyph="fleuron" size={13} className="text-brass" />
                <span
                  className="font-display italic font-medium text-[11px] tracking-[0.18em] uppercase [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:text-[12px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
                >
                  {t('info.heading')}
                </span>
              </div>
              <p
                className="text-ink-soft font-display text-[15px] leading-[1.55] [dir=rtl]:font-arabic [dir=rtl]:leading-[1.85]"
              >
                {t('info.description')}
              </p>
            </div>

            <ul className="space-y-3.5">
              <li className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/30 bg-paper-soft text-brass">
                  <Mail className="h-4 w-4" aria-hidden />
                </span>
                <a
                  href={`mailto:${t('info.email')}`}
                  className="text-ink editorial-link font-display text-[14px] [dir=rtl]:font-arabic"
                >
                  {t('info.email')}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/30 bg-paper-soft text-brass">
                  <Phone className="h-4 w-4" aria-hidden />
                </span>
                <span
                  className="text-ink font-display italic text-[14px]"
                >
                  {t('info.phone')}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/30 bg-paper-soft text-brass">
                  <MapPin className="h-4 w-4" aria-hidden />
                </span>
                <span
                  className="text-ink font-display text-[14px] [dir=rtl]:font-arabic"
                >
                  {t('info.location')}
                </span>
              </li>
            </ul>

            <div className="rule-ornament my-2" />

            <div>
              <h3
                className="mb-3 font-display font-medium text-[10.5px] tracking-[0.18em] text-ink-muted uppercase [dir=rtl]:font-arabic [dir=rtl]:text-[12px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
              >
                {t('info.social')}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {socialLinks.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/30 bg-paper-soft text-ink transition-all duration-300 hover:border-brass hover:bg-ink hover:text-paper-soft"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="paper-card-warm mt-2 rounded p-5">
              <div className="flex items-baseline gap-2">
                <Ornament glyph="asterism" size={11} className="text-garnet" />
                <p
                  className="font-display font-semibold text-[10.5px] tracking-[0.16em] text-garnet uppercase [dir=rtl]:font-arabic [dir=rtl]:text-[12px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
                >
                  {t('info.speaking_label')}
                </p>
              </div>
              <p
                className="mt-2 text-ink-soft font-display text-[14px] leading-[1.5] [dir=rtl]:font-arabic [dir=rtl]:leading-[1.85]"
              >
                {t('info.speaking_text')}
              </p>
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
