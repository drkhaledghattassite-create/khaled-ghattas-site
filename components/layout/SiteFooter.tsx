'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'

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
            { label: tNav('gallery'), href: '/gallery' },
          ],
        },
        {
          title: 'المتجر',
          items: [
            { label: tNav('books'), href: '/books' },
            { label: tNav('interviews'), href: '/interviews' },
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
            { label: tNav('gallery'), href: '/gallery' },
          ],
        },
        {
          title: 'Store',
          items: [
            { label: tNav('books'), href: '/books' },
            { label: tNav('interviews'), href: '/interviews' },
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

  const sign = isRtl
    ? 'كل ما يستحق أن يُقرأ، يستحق أن يُكتَب بصدق.'
    : 'Anything worth reading is worth writing honestly.'

  return (
    <footer
      dir={isRtl ? 'rtl' : 'ltr'}
      className="bg-[var(--color-bg)] [padding-top:clamp(80px,10vw,128px)]"
    >
      <div className="mx-auto max-w-[var(--container-max)] grid items-start gap-[clamp(40px,6vw,96px)] [padding-inline:clamp(20px,5vw,56px)] md:grid-cols-[1.2fr_2fr]">
        {/* Sign */}
        <div>
          <p
            className={`m-0 max-w-[360px] text-[clamp(20px,2.4vw,28px)] leading-[1.4] font-medium tracking-[-0.005em] text-[var(--color-fg1)] [text-wrap:pretty] ${
              isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.015em]'
            }`}
          >
            {sign}
          </p>
          <span
            className={`block mt-4 text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--color-fg3)] ${
              isRtl ? 'font-arabic-body !tracking-normal !normal-case !font-semibold !text-[13px]' : 'font-display'
            }`}
          >
            — {t('brand')}
          </span>
        </div>

        {/* Cols grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {cols.map((c) => (
            <div key={c.title}>
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
            </div>
          ))}
        </div>
      </div>

      {/* Rule */}
      <div className="mx-auto h-px bg-[var(--color-border)] max-w-[var(--container-max)] [margin:clamp(64px,8vw,96px)_clamp(20px,5vw,56px)_0]" />

      {/* Bottom */}
      <div
        className={`mx-auto max-w-[var(--container-max)] grid items-center gap-5 [padding:24px_clamp(20px,5vw,56px)_32px] grid-cols-1 md:grid-cols-[auto_1fr_auto] text-[12px] text-[var(--color-fg3)] ${
          isRtl ? 'font-arabic-body !text-[13px]' : 'font-display'
        }`}
      >
        <span>
          © {new Date().getFullYear()} {t('brand')}
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
