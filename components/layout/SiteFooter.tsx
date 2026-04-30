'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { AnimatedText } from '@/components/motion/AnimatedText'
import { staggerContainer, staggerItem } from '@/lib/motion/variants'

export function SiteFooter() {
  const t = useTranslations('footer')
  const tNav = useTranslations('nav')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  const cols = isRtl
    ? [
        {
          title: 'الموقع',
          items: [
            { label: tNav('home'), href: '/' },
            { label: tNav('about'), href: '/about' },
            { label: tNav('articles'), href: '/articles' },
            { label: tNav('interviews'), href: '/interviews' },
          ],
        },
        {
          title: 'المتجر',
          items: [
            { label: tNav('books'), href: '/books' },
            { label: tNav('events'), href: '/events' },
          ],
        },
        {
          title: 'تواصل',
          items: [{ label: tNav('contact'), href: '/contact' }],
        },
      ]
    : [
        {
          title: 'Site',
          items: [
            { label: tNav('home'), href: '/' },
            { label: tNav('about'), href: '/about' },
            { label: tNav('articles'), href: '/articles' },
            { label: tNav('interviews'), href: '/interviews' },
          ],
        },
        {
          title: 'Store',
          items: [
            { label: tNav('books'), href: '/books' },
            { label: tNav('events'), href: '/events' },
          ],
        },
        {
          title: 'Connect',
          items: [{ label: tNav('contact'), href: '/contact' }],
        },
      ]

  const social: Array<[string, string]> = [
    ['Instagram', 'https://www.instagram.com'],
    ['YouTube', 'https://www.youtube.com'],
    ['X', 'https://x.com'],
    ['LinkedIn', 'https://www.linkedin.com'],
  ]

  // Brand quote — editorial colophon treatment
  const sign = isRtl
    ? 'كل ما يستحق أن يُقرأ، يستحق أن يُكتَب بصدق.'
    : 'Anything worth reading is worth writing honestly.'

  return (
    <footer
      dir={isRtl ? 'rtl' : 'ltr'}
      className="bg-[var(--color-bg)] border-t border-[var(--color-border)] [padding-top:clamp(80px,10vw,128px)]"
    >
      {/* Brand colophon — accent rule + quote + attribution */}
      <div className="mx-auto max-w-[var(--container-max)] [padding-inline:clamp(20px,5vw,56px)]">
        <div className="grid items-start gap-[clamp(40px,6vw,96px)] md:grid-cols-[1.2fr_2fr]">
          {/* Sign block */}
          <div>
            <motion.span
              aria-hidden
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: isRtl ? 'right' : 'left' }}
              className="block w-10 h-[3px] bg-[var(--color-accent)] mb-7"
            />
            <AnimatedText
              as="p"
              text={sign}
              by="word"
              stagger={0.04}
              duration={0.6}
              className={`m-0 max-w-[400px] text-[clamp(22px,2.6vw,30px)] leading-[1.4] font-medium tracking-[-0.005em] text-[var(--color-fg1)] [text-wrap:pretty] ${
                isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.018em]'
              }`}
            />
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
              className={`block mt-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body !tracking-normal !normal-case !text-[13px] !font-bold' : 'font-display'
              }`}
            >
              — {t('brand')}
            </motion.span>
          </div>

          {/* Cols grid */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-15%' }}
            className="grid grid-cols-2 md:grid-cols-3 gap-8"
          >
            {cols.map((c) => (
              <motion.div key={c.title} variants={staggerItem}>
                <span
                  className={`block mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] ${
                    isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
                  }`}
                >
                  {c.title}
                </span>
                <ul className="flex flex-col gap-2.5 list-none m-0 p-0">
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
      </div>

      {/* Hairline */}
      <div className="mx-auto h-px bg-[var(--color-border)] max-w-[var(--container-max)] [margin:clamp(64px,8vw,96px)_clamp(20px,5vw,56px)_0]" />

      {/* Colophon row */}
      <div
        className={`mx-auto max-w-[var(--container-max)] grid items-center gap-5 [padding:24px_clamp(20px,5vw,56px)_32px] grid-cols-1 md:grid-cols-[auto_1fr_auto] text-[12px] text-[var(--color-fg3)] ${
          isRtl ? 'font-arabic-body !text-[13px]' : 'font-display'
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <span className="num-latn">©&nbsp;{new Date().getFullYear()}</span>
          <span aria-hidden className="inline-block w-1 h-1 rounded-full bg-[var(--color-border-strong)]" />
          <span>{isRtl ? 'بيروت — لبنان' : 'Beirut — Lebanon'}</span>
        </span>
        <ul className="flex flex-wrap gap-6 list-none m-0 p-0 md:justify-self-center">
          {social.map(([label, href]) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[var(--color-fg2)] hover:text-[var(--color-fg1)] transition-colors"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <span>{t('copyright')}</span>
      </div>
    </footer>
  )
}
