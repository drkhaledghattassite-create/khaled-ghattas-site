'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import type { ComponentType, SVGProps } from 'react'
import { Link } from '@/lib/i18n/navigation'
import { LogoLink } from '@/components/shared/Logo'
import { AnimatedText } from '@/components/motion/AnimatedText'
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  TwitterIcon,
  YouTubeIcon,
} from '@/components/shared/social-icons'
import { SOCIAL_LINKS } from '@/lib/constants'
import { staggerContainer, staggerItem, EASE_EDITORIAL } from '@/lib/motion/variants'

const DEVELOPER_LINKEDIN_URL = 'https://www.linkedin.com/in/kamal-chhimi-77684b228'
const DEVELOPER_WHATSAPP_URL = 'https://wa.me/96181447195'

type FooterToggles = {
  show_footer_social: boolean
  show_footer_brand: boolean
  show_footer_quick_links: boolean
  show_footer_colophon: boolean
}

type NavToggles = {
  show_nav_books: boolean
  show_nav_articles: boolean
  show_nav_interviews: boolean
  show_nav_events: boolean
  show_nav_about: boolean
  show_nav_contact: boolean
  show_nav_corporate: boolean
  show_nav_booking: boolean
  show_nav_tests: boolean
  show_nav_send_gift: boolean
}

const DEFAULT_FOOTER: FooterToggles = {
  show_footer_social: true,
  show_footer_brand: true,
  show_footer_quick_links: true,
  show_footer_colophon: true,
}

const DEFAULT_NAV: NavToggles = {
  show_nav_books: true,
  show_nav_articles: true,
  show_nav_interviews: true,
  show_nav_events: true,
  show_nav_about: true,
  show_nav_contact: true,
  show_nav_corporate: true,
  show_nav_booking: true,
  show_nav_tests: true,
  // Mirrors the site-settings default — gifts aren't promoted in nav unless
  // the admin flips the toggle on.
  show_nav_send_gift: false,
}

type Props = {
  footer?: FooterToggles
  nav?: NavToggles
}

export function SiteFooter({
  footer = DEFAULT_FOOTER,
  nav = DEFAULT_NAV,
}: Props = {}) {
  const t = useTranslations('footer')
  const tNav = useTranslations('nav')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  const showAbout = nav.show_nav_about
  const showArticles = nav.show_nav_articles
  const showInterviews = nav.show_nav_interviews
  const showBooks = nav.show_nav_books
  const showEvents = nav.show_nav_events
  const showContact = nav.show_nav_contact
  const showCorporate = nav.show_nav_corporate
  const showBooking = nav.show_nav_booking
  const showTests = nav.show_nav_tests
  const showSendGift = nav.show_nav_send_gift

  const allCols: Array<{
    title: string
    items: Array<{ label: string; href: string }>
  }> = [
    {
      title: t('column_site'),
      items: [
        { label: tNav('home'), href: '/' },
        ...(showAbout ? [{ label: tNav('about'), href: '/about' }] : []),
        ...(showArticles ? [{ label: tNav('articles'), href: '/articles' }] : []),
        ...(showInterviews
          ? [{ label: tNav('interviews'), href: '/interviews' }]
          : []),
      ],
    },
    {
      title: t('column_store'),
      items: [
        ...(showBooks ? [{ label: tNav('books'), href: '/books' }] : []),
        ...(showEvents ? [{ label: tNav('events'), href: '/events' }] : []),
      ],
    },
    {
      title: t('column_connect'),
      items: [
        ...(showCorporate
          ? [{ label: tNav('corporate'), href: '/corporate' }]
          : []),
        ...(showBooking
          ? [{ label: tNav('booking'), href: '/booking/tours' }]
          : []),
        ...(showTests ? [{ label: tNav('tests'), href: '/tests' }] : []),
        ...(showSendGift
          ? [{ label: tNav('send_gift'), href: '/gifts/send' }]
          : []),
        ...(showContact ? [{ label: tNav('contact'), href: '/contact' }] : []),
      ],
    },
  ]
  const cols = allCols.filter((c) => c.items.length > 0)

  type SocialIcon = ComponentType<SVGProps<SVGSVGElement>>
  const social: Array<{ label: string; href: string; Icon: SocialIcon }> = [
    { label: 'Instagram', href: SOCIAL_LINKS.instagram, Icon: InstagramIcon },
    { label: 'Facebook', href: SOCIAL_LINKS.facebook, Icon: FacebookIcon },
    { label: 'YouTube', href: SOCIAL_LINKS.youtube, Icon: YouTubeIcon },
    { label: 'TikTok', href: SOCIAL_LINKS.tiktok, Icon: TikTokIcon },
    { label: 'X', href: SOCIAL_LINKS.x, Icon: TwitterIcon },
    { label: 'LinkedIn', href: SOCIAL_LINKS.linkedin, Icon: LinkedInIcon },
  ]

  return (
    <footer
      dir={isRtl ? 'rtl' : 'ltr'}
      data-hide-in-focus="true"
      className="bg-[var(--color-bg)] border-t border-[var(--color-border)] [padding-top:clamp(40px,5vw,64px)]"
    >
      {/* Brand mark + quick links — unified 4-track row at desktop */}
      <div className="mx-auto max-w-[var(--container-max)] [padding-inline:clamp(20px,5vw,56px)]">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-15%' }}
          className="grid items-start gap-x-8 gap-y-10 grid-cols-2 md:grid-cols-[auto_repeat(3,minmax(0,1fr))]"
        >
          {/* Logo block — spans both columns on mobile, sits in track 1 at md+ */}
          <motion.div variants={staggerItem} className="col-span-2 md:col-span-1">
            <LogoLink href="/" alt={t('brand')} height={40} />
            <motion.span
              aria-hidden
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ duration: 0.6, ease: EASE_EDITORIAL, delay: 0.18 }}
              style={{ transformOrigin: isRtl ? 'right' : 'left' }}
              className="block w-[40px] h-[2px] bg-[var(--color-accent)] mt-4"
            />
          </motion.div>

          {/* Quick links columns — distribute evenly across the 3 remaining tracks */}
          {footer.show_footer_quick_links &&
            cols.map((c) => (
              <motion.div key={c.title} variants={staggerItem}>
                <span
                  className={`block mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] ${
                    isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
                  }`}
                >
                  {c.title}
                </span>
                <ul className="flex flex-col gap-2 list-none m-0 p-0">
                  {c.items.map((it) => (
                    <li key={it.label}>
                      <Link
                        href={it.href}
                        className="text-[14px] text-[var(--color-fg2)] hover:text-[var(--color-fg1)] transition-colors"
                      >
                        {it.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
        </motion.div>
      </div>

      {/* Brand quote — editorial signature */}
      {footer.show_footer_brand && (
        <aside
          className="mx-auto max-w-[var(--container-max)] [padding-inline:clamp(20px,5vw,56px)] [margin-top:clamp(28px,4vw,48px)]"
          aria-label={t('brand_quote_attribution')}
        >
          <motion.span
            aria-hidden
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
            style={{ transformOrigin: isRtl ? 'right' : 'left' }}
            className="block w-10 h-px bg-[var(--color-accent)] mb-4"
          />
          <figure className="m-0">
            <AnimatedText
              as="blockquote"
              text={t('brand_quote')}
              by="word"
              stagger={0.04}
              duration={0.6}
              className={`m-0 max-w-[620px] text-[clamp(18px,2vw,24px)] leading-[1.55] font-medium tracking-[-0.005em] text-[var(--color-fg2)] italic-feel [text-wrap:pretty] ${
                isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.012em]'
              }`}
            />
            <motion.figcaption
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ duration: 0.5, ease: EASE_EDITORIAL, delay: 0.4 }}
              className={`mt-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] not-italic ${
                isRtl ? 'font-arabic-body !tracking-normal !normal-case !text-[13px] !font-bold' : 'font-display'
              }`}
            >
              — {t('brand_quote_attribution')}
            </motion.figcaption>
          </figure>
        </aside>
      )}

      {/* Hairline */}
      {footer.show_footer_colophon && (
        <div className="mx-auto h-px bg-[var(--color-border)] max-w-[var(--container-max)] [margin:clamp(40px,5vw,64px)_clamp(20px,5vw,56px)_0]" />
      )}

      {/* Colophon row */}
      {footer.show_footer_colophon && (
        <div
          className={`mx-auto max-w-[var(--container-max)] grid items-center gap-4 [padding:18px_clamp(20px,5vw,56px)_24px] grid-cols-1 md:grid-cols-[auto_1fr_auto] text-[12px] text-[var(--color-fg3)] ${
            isRtl ? 'font-arabic-body !text-[13px]' : 'font-display'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <span className="num-latn">©&nbsp;{new Date().getFullYear()}</span>
            <span aria-hidden className="inline-block w-1 h-1 rounded-full bg-[var(--color-border-strong)]" />
            <span>{t('location')}</span>
          </span>
          {footer.show_footer_social ? (
            <ul className="flex flex-wrap items-center gap-2 list-none m-0 p-0 md:justify-self-center">
              {social.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-fg2)] transition-colors duration-200 hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <span aria-hidden />
          )}
          <span>{t('copyright')}</span>
        </div>
      )}

      {/* Developer credit — single English-only row */}
      <div className="border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-[var(--container-max)] py-4 [padding-inline:clamp(20px,5vw,56px)]">
          <p dir="ltr" className="flex items-center justify-center gap-2 text-[11px] font-display tracking-[0.04em] text-[var(--color-fg3)]">
            Designed &amp; Developed by{' '}
            <a
              href={DEVELOPER_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with Kamal Chhimi on WhatsApp"
              className="text-[var(--color-fg2)] transition-colors duration-200 hover:text-[var(--color-accent)]"
            >
              Kamal Chhimi
            </a>
            <a
              href={DEVELOPER_LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kamal Chhimi on LinkedIn"
              className="inline-flex items-center justify-center text-[var(--color-fg3)] transition-colors duration-200 hover:text-[var(--color-accent)]"
            >
              <LinkedInIcon className="h-3 w-3" aria-hidden="true" />
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
