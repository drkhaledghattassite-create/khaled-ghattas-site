'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import type { Article } from '@/lib/db/queries'
import { cn } from '@/lib/utils'

const EASE_IN_OUT_QUART: [number, number, number, number] = [0.77, 0, 0.175, 1]
const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]
const EASE_BACK_OUT: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

type ArticlesListProps = {
  /** Articles to render (already filtered + ordered by the queries layer). */
  articles: Article[]
  /** Show heading + "view all" CTA. false on /articles. */
  showHeader?: boolean
}

/** Articles section — see FULL_AUDIT.md §5. */
export function ArticlesList({ articles, showHeader = true }: ArticlesListProps) {
  const locale = useLocale()
  const t = useTranslations('articles.heading')
  const tCta = useTranslations('cta')
  const isRtl = locale === 'ar'
  const rows = articles

  return (
    <section className="relative z-[2] bg-cream px-[var(--spacing-md)] py-[var(--spacing-xl)]">
      <div className="mx-auto max-w-[1440px]">
        {showHeader && (
        <header className="mb-[var(--spacing-lg)] space-y-2">
          <MaskedLine delay={0}>
            <span
              className="text-ink"
              style={{
                fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
                fontStyle: isRtl ? 'normal' : 'italic',
                fontWeight: isRtl ? 700 : 400,
                fontSize: 'clamp(42px, 11vw, 88.2px)',
                lineHeight: 1.05,
              }}
            >
              {t('part_1')}
            </span>
          </MaskedLine>
          <MaskedLine delay={0.15}>
            <span
              className="uppercase text-ink"
              style={{
                fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
                fontWeight: isRtl ? 700 : 600,
                fontSize: 'clamp(42px, 11vw, 92.88px)',
                lineHeight: 0.95,
                letterSpacing: isRtl ? 'normal' : '-3px',
              }}
            >
              {t('part_2')}
            </span>
          </MaskedLine>

          <div className="pt-8">
            <Link
              href="/articles"
              className="group relative inline-flex items-center gap-2 rounded-full border border-dashed border-ink px-4 py-2 text-[13px] text-ink transition-colors duration-300 hover:bg-ink hover:text-cream-soft"
              style={{ letterSpacing: '0.08em' }}
            >
              <span aria-hidden className="h-[9px] w-[9px] rounded-full bg-ink transition-colors duration-300 group-hover:bg-cream-soft" />
              <span className="font-label">{tCta('view_all_articles')}</span>
            </Link>
          </div>
        </header>
        )}

        <div>
          {rows.map((article, i) => (
            <ArticleRow key={article.id} article={article} index={i} isRtl={isRtl} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Row entrance + 4-effect hover:
 *  1. black wipe left→right (start→end edge), date color inverts
 *  2. heading shifts 32px toward end
 *  3. paper-div 7em square pops out at end
 *  4. cream-soft bottom sweep grows upward
 */
function ArticleRow({
  article,
  index,
  isRtl,
  locale,
}: {
  article: Article
  index: number
  isRtl: boolean
  locale: string
}) {
  const [hovered, setHovered] = useState(false)
  const dateLabel = (article.publishedAt ?? article.createdAt)
    .toISOString()
    .slice(0, 10)
  const title = locale === 'ar' ? article.titleAr : article.titleEn
  const shift = isRtl ? -32 : 32
  const wipeOrigin = isRtl ? 'right center' : 'left center'

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      initial={{ y: 30, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay: index * 0.06, ease: EASE_OUT_QUART }}
      className={cn(
        'group relative grid items-start gap-3 md:items-center md:gap-6',
        'grid-cols-1 md:grid-cols-[auto_1fr_auto]',
        'isolate overflow-hidden border-b border-dashed border-ink/40 py-6 md:py-8',
      )}
    >
      <Link href={`/articles/${article.slug}`} className="absolute inset-0 z-10" aria-label={title} />

      <motion.span
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 bg-cream-soft"
        initial={{ height: '0%' }}
        animate={{ height: hovered ? '100%' : '0%' }}
        transition={{ duration: 0.38, ease: 'easeInOut' }}
      />

      <div className="relative flex items-center gap-3 overflow-hidden">
        <motion.span
          aria-hidden
          className="absolute inset-y-0 bg-ink"
          style={{ insetInlineStart: 0, transformOrigin: wipeOrigin }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: hovered ? 1 : 0, width: '100%' }}
          transition={{ duration: 0.38, ease: EASE_IN_OUT_QUART }}
        />
        <motion.span
          className="relative px-2 text-[12.96px] uppercase tracking-[0.4px]"
          style={{ fontFamily: 'var(--font-oswald)' }}
          animate={{ color: hovered ? '#F6F4F1' : '#BC884A' }}
          transition={{ duration: 0.38, ease: EASE_IN_OUT_QUART }}
        >
          {dateLabel}
        </motion.span>
      </div>

      <motion.h3
        className="uppercase text-ink"
        animate={{ x: hovered ? shift : 0 }}
        transition={{ duration: 0.38, ease: 'easeOut' }}
        style={{
          fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
          fontWeight: isRtl ? 700 : 600,
          fontSize: 'clamp(22px, 5.5vw, 43.2px)',
          lineHeight: 1.15,
          letterSpacing: isRtl ? 'normal' : '-1px',
        }}
      >
        {title}
      </motion.h3>

      <motion.div
        className="relative hidden items-center justify-center overflow-hidden border border-dashed border-ink bg-cream md:flex"
        initial={{ width: 0, height: 0 }}
        animate={{ width: hovered ? '7em' : 0, height: hovered ? '7em' : 0 }}
        transition={{ duration: 0.42, ease: EASE_BACK_OUT }}
        style={{ willChange: 'width, height' }}
        aria-hidden
      >
        <span
          className="absolute bottom-0 h-3 w-3 bg-ink"
          style={{
            insetInlineEnd: 0,
            clipPath: isRtl ? 'polygon(0 0, 0 100%, 100% 100%)' : 'polygon(100% 0, 100% 100%, 0 100%)',
          }}
        />
        <motion.span
          className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-cream"
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.2, delay: 0.12 }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3 7l4-4M3 3h4v4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </motion.span>
      </motion.div>
    </motion.div>
  )
}

function MaskedLine({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <span className="relative block overflow-hidden">
      <motion.span
        className="relative inline-block"
        initial={{ y: '100%', opacity: 0 }}
        whileInView={{ y: '0%', opacity: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.8, delay, ease: EASE_IN_OUT_QUART }}
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
        <motion.span
          aria-hidden
          className="absolute inset-0 bg-amber"
          initial={{ scaleX: 1 }}
          whileInView={{ scaleX: 0 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.8, delay, ease: EASE_IN_OUT_QUART }}
          style={{ transformOrigin: 'right center', mixBlendMode: 'multiply' }}
        />
      </motion.span>
    </span>
  )
}
