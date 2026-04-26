'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function Hero() {
  const locale = useLocale()
  const t = useTranslations('hero')
  const tCta = useTranslations('cta')
  const isRtl = locale === 'ar'

  const firstName = isRtl ? 'خالد' : 'Khaled'
  const lastName = isRtl ? 'غطاس' : 'Ghattass'
  const established = isRtl ? 'منذ ٢٠١٠' : 'Since 2010'
  const roles = isRtl
    ? [t('line_2'), t('line_4'), t('line_5')]
    : ['Cell Biologist', 'Human Behavior Expert', 'Author & Speaker']

  return (
    <section
      id="top"
      aria-label={t('section_label')}
      className="relative bg-[var(--color-bg)] border-b border-[var(--color-border)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="relative mx-auto max-w-[var(--container-max)] [padding:clamp(72px,8vw,120px)_clamp(20px,5vw,56px)_clamp(96px,9vw,140px)]">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
          className="eyebrow-accent mb-6"
        >
          {t('eyebrow')}
        </motion.div>

        {/* Monumental name */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
          className="font-arabic-display flex flex-col text-[clamp(72px,16vw,220px)] leading-[0.88] tracking-[-0.04em] font-black text-[var(--color-fg1)]"
        >
          <span>{firstName}</span>
          <span>{lastName}</span>
        </motion.h1>

        {/* Accent rule under name */}
        <motion.span
          aria-hidden
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
          className="block mt-6 w-[clamp(40px,5vw,56px)] h-[clamp(3px,0.4vw,4px)] bg-[var(--color-accent)]"
          style={{ transformOrigin: isRtl ? 'right' : 'left' }}
        />

        {/* Statement */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.35 }}
          className="font-arabic-body mt-8 max-w-[720px] text-[clamp(18px,2.4vw,28px)] leading-[1.5] font-normal text-[var(--color-fg2)]"
        >
          {t('description')}
        </motion.p>

        {/* Bottom row: roles + CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.5 }}
          className="mt-12 flex flex-wrap items-center justify-between gap-x-8 gap-y-6"
        >
          <ul className="flex flex-wrap gap-x-7 gap-y-3 list-none m-0 p-0">
            {roles.map((role) => (
              <li
                key={role}
                className="relative ps-4 text-[14px] font-medium text-[var(--color-fg2)] font-arabic-body"
              >
                <span
                  aria-hidden
                  className="absolute top-1/2 -translate-y-1/2 [inset-inline-start:0] w-[6px] h-[6px] rounded-full bg-[var(--color-fg3)]"
                />
                {role}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3">
            <Link href="/articles" className="btn-pill btn-pill-primary">
              {tCta('articles')}
            </Link>
            <Link href="/books" className="btn-pill btn-pill-secondary">
              {tCta('books')}
            </Link>
          </div>
        </motion.div>

        {/* Established stamp — desktop only */}
        <span
          className={`hidden md:block absolute bottom-7 [inset-inline-start:clamp(20px,5vw,56px)] text-[11px] font-medium text-[var(--color-fg3)] ${
            isRtl ? 'font-arabic-body' : 'font-display uppercase tracking-[0.18em]'
          }`}
        >
          {established}
        </span>

        {/* Portrait medallion — top opposite corner */}
        <motion.figure
          aria-hidden
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
          className="absolute m-0 overflow-hidden rounded-full bg-[var(--color-bg-deep)] [inset-inline-end:clamp(20px,5vw,56px)] top-[clamp(72px,8vw,120px)] w-[clamp(72px,11vw,144px)] aspect-square"
        >
          <Image
            src="/dr-khaled-portrait.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 144px, 96px"
            className="object-cover object-[center_18%] [filter:grayscale(0.15)]"
          />
        </motion.figure>
      </div>
    </section>
  )
}
