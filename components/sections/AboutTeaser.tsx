'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import {
  blurRevealBidirectional,
  staggerContainer,
  staggerItem,
  EASE_EDITORIAL,
  VIEWPORT_BIDIRECTIONAL,
} from '@/lib/motion/variants'
import { ScrollRevealLine } from '@/components/motion/ScrollRevealLine'

const EASE = EASE_EDITORIAL

export function AboutTeaser() {
  const t = useTranslations('about_teaser')
  const tFooter = useTranslations('about_teaser')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  void tFooter

  const stats = [
    { num: t('stats.years_value'), label: t('stats.years_label') },
    { num: t('stats.lectures_value'), label: t('stats.lectures_label') },
    { num: t('stats.followers_value'), label: t('stats.followers_label') },
    { num: t('stats.books_value'), label: t('stats.books_label') },
  ]

  const venues = ['Harvard', 'Cornell', 'Stanford', 'AUB Beirut']
  const outlets = isRtl
    ? ['BBC عربي', 'الجزيرة', 'سكاي نيوز عربية', 'LBC', 'MTV Lebanon', 'العربية', 'OTV']
    : ['BBC Arabic', 'Al Jazeera', 'Sky News Arabia', 'LBC', 'MTV Lebanon', 'Al Arabiya', 'OTV']

  const venuesLabel = t('venues_label')
  const outletsLabel = t('outlets_label')
  const affiliation = t('affiliation')

  return (
    <section
      id="about"
      className="border-b border-[var(--color-border)] [padding:clamp(80px,10vw,140px)_clamp(20px,5vw,56px)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-[1080px] grid gap-[clamp(40px,6vw,72px)]">
        {/* Header — design qh-about-head: pulled toward quote with negative margin */}
        <header className="-mb-4">
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

        {/* Featured pull-quote bio — bidirectional: dims back out when scrolled past */}
        <motion.blockquote
          variants={blurRevealBidirectional}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_BIDIRECTIONAL}
          className="m-0 relative ps-[clamp(28px,5vw,48px)] py-1 border-s-[3px] border-[var(--color-accent)]"
        >
          <ScrollRevealLine
            as="p"
            offset={['start 0.85', 'start 0.3']}
            className={`m-0 text-[clamp(24px,3.4vw,38px)] font-medium [text-wrap:pretty] ${
              isRtl ? 'font-arabic-display leading-[1.45]' : 'font-arabic-display leading-[1.35] tracking-[-0.018em]'
            }`}
          >
            {t('bio_preview_fallback')}
          </ScrollRevealLine>
          <footer
            className={`mt-[22px] inline-flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-fg3)] before:content-[''] before:w-6 before:h-px before:bg-[var(--color-border-strong)] before:inline-block ${
              isRtl ? 'font-arabic-body !tracking-normal !normal-case !text-[14px] !font-bold' : 'font-display'
            }`}
          >
            {affiliation}
          </footer>
        </motion.blockquote>

        {/* Stats grid */}
        <motion.dl
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-15%' }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 m-0 pt-8 border-t border-[var(--color-border)]"
        >
          {stats.map((s) => (
            <motion.div key={s.label} variants={staggerItem} className="flex flex-col">
              <dt
                className={`text-[clamp(40px,5vw,64px)] leading-[0.95] font-extrabold tracking-[-0.03em] text-[var(--color-fg1)] [font-feature-settings:'tnum'] ${
                  isRtl ? 'font-arabic-display' : 'font-display'
                }`}
              >
                {s.num}
              </dt>
              <dd className="mt-3 m-0 text-[13px] tracking-[0.02em] text-[var(--color-fg3)]">
                {s.label}
              </dd>
            </motion.div>
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
