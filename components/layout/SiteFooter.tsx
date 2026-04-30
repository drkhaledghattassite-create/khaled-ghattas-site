'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import type { ComponentType, SVGProps } from 'react'
import { Link } from '@/lib/i18n/navigation'
import { LogoLink } from '@/components/shared/Logo'
import { AnimatedText } from '@/components/motion/AnimatedText'
import {
  InstagramIcon,
  LinkedInIcon,
  TwitterIcon,
  YouTubeIcon,
} from '@/components/shared/social-icons'
import { staggerContainer, staggerItem, EASE_EDITORIAL } from '@/lib/motion/variants'

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
      items: showContact ? [{ label: tNav('contact'), href: '/contact' }] : [],
    },
  ]
  const cols = allCols.filter((c) => c.items.length > 0)

  type SocialIcon = ComponentType<SVGProps<SVGSVGElement>>
  const social: Array<{ label: string; href: string; Icon: SocialIcon }> = [
    { label: 'LinkedIn', href: 'https://www.linkedin.com', Icon: LinkedInIcon },
    { label: 'X', href: 'https://x.com', Icon: TwitterIcon },
    { label: 'YouTube', href: 'https://www.youtube.com', Icon: YouTubeIcon },
    { label: 'Instagram', href: 'https://www.instagram.com', Icon: InstagramIcon },
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
    </footer>
  )
}
