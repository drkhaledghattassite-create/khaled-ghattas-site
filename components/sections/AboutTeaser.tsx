'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function AboutTeaser() {
  const t = useTranslations('about_teaser')
  const tFooter = useTranslations('about_teaser')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  void tFooter

  const stats = [
    { num: isRtl ? '+١٥' : '15+', label: t('stats.years_label') },
    { num: isRtl ? '+١٬٠٠٠' : '1,000+', label: t('stats.lectures_label') },
    { num: isRtl ? '+١م' : '1M+', label: isRtl ? 'متابع رقمي' : 'Followers digital' },
    { num: isRtl ? '٦' : '6', label: t('stats.books_label') },
  ]

  const venues = ['Harvard', 'Cornell', 'Stanford', 'AUB Beirut']
  const outlets = isRtl
    ? ['BBC عربي', 'الجزيرة', 'سكاي نيوز عربية', 'LBC', 'MTV Lebanon', 'العربية', 'OTV']
    : ['BBC Arabic', 'Al Jazeera', 'Sky News Arabia', 'LBC', 'MTV Lebanon', 'Al Arabiya', 'OTV']

  const venuesLabel = isRtl ? 'محاضرات في' : 'Spoken at'
  const outletsLabel = isRtl ? 'حضور إعلامي' : 'Media appearances'
  const affiliation = isRtl
    ? 'مؤسس مبادرة «الورشة» الاجتماعية في لبنان.'
    : 'Founder of Al-Warsheh, a social initiative in Lebanon.'

  return (
    <section
      id="about"
      className="border-b border-[var(--color-border)] [padding:clamp(80px,10vw,140px)_clamp(20px,5vw,56px)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-[1080px] grid gap-[clamp(40px,6vw,72px)]">
        {/* Header */}
        <header>
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="section-eyebrow"
          >
            {t('eyebrow')}
          </motion.span>
        </header>

        {/* Featured pull-quote bio */}
        <motion.blockquote
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="m-0 ps-[clamp(24px,4vw,40px)] border-s-2 border-[var(--color-accent)]"
        >
          <p
            className={`m-0 text-[clamp(22px,3.2vw,34px)] font-medium text-[var(--color-fg1)] ${
              isRtl ? 'font-arabic-display leading-[1.5]' : 'font-arabic-display leading-[1.4] tracking-[-0.015em]'
            }`}
          >
            {t('bio_preview_fallback')}
          </p>
          <footer
            className={`mt-[18px] text-[14px] font-medium text-[var(--color-fg3)] ${
              isRtl ? 'font-arabic-body' : 'font-display tracking-[0.02em]'
            }`}
          >
            {affiliation}
          </footer>
        </motion.blockquote>

        {/* Stats grid */}
        <motion.dl
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 m-0 pt-8 border-t border-[var(--color-border)]"
        >
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <dt
                className={`text-[clamp(40px,5vw,64px)] leading-[0.95] tracking-[-0.03em] text-[var(--color-fg1)] [font-feature-settings:'tnum'] ${
                  isRtl ? 'font-arabic-display' : 'font-display'
                }`}
                style={{ fontWeight: 800 }}
              >
                {s.num}
              </dt>
              <dd className="mt-3 m-0 text-[13px] tracking-[0.02em] text-[var(--color-fg3)]">
                {s.label}
              </dd>
            </div>
          ))}
        </motion.dl>

        {/* Rows: venues + outlets */}
        <div className="grid grid-cols-1 gap-6 pt-6 border-t border-[var(--color-border)]">
          {[
            { label: venuesLabel, items: venues, strong: true },
            { label: outletsLabel, items: outlets, strong: false },
          ].map((row) => (
            <div
              key={row.label}
              className="grid items-start gap-6 md:grid-cols-[180px_1fr]"
            >
              <span
                className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] pt-1 ${
                  isRtl ? 'font-arabic-body !tracking-normal !normal-case !text-[13px] !font-bold' : 'font-display'
                }`}
              >
                {row.label}
              </span>
              <ul className="flex flex-wrap gap-y-1.5 gap-x-[22px] list-none m-0 p-0">
                {row.items.map((item, i, arr) => (
                  <li
                    key={item}
                    className={`relative tracking-[-0.005em] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    } ${
                      row.strong
                        ? 'text-[16px] font-semibold text-[var(--color-fg1)]'
                        : 'text-[15px] font-medium text-[var(--color-fg2)]'
                    } ${
                      !row.strong && i < arr.length - 1
                        ? "after:content-[''] after:absolute after:[inset-inline-end:-13px] after:top-1/2 after:-translate-y-1/2 after:w-[3px] after:h-[3px] after:rounded-full after:bg-[var(--color-border-strong)]"
                        : ''
                    }`}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex justify-start pt-2">
          <Link
            href="/about"
            className={`link-underline ${isRtl ? 'font-arabic-body' : 'font-display'}`}
          >
            {t('cta_more')}
            <span aria-hidden>{isRtl ? '←' : '→'}</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
