'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { cn } from '@/lib/utils'

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]
const EASE_IN_OUT_QUART: [number, number, number, number] = [0.77, 0, 0.175, 1]

/* Staggered headline reveal — each line slides up + fades in 80ms after the
   previous one, matching the Webflow hero stagger (see BEHAVIORS.md §2.2). */
function LineReveal({
  children,
  delay,
  className,
}: {
  children: React.ReactNode
  delay: number
  className?: string
}) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className={cn('block', className)}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT_QUART, delay }}
      >
        {children}
      </motion.span>
    </span>
  )
}

function CtaPill({
  href,
  children,
  delay,
  variant = 'outline',
}: {
  href: string
  children: React.ReactNode
  delay: number
  variant?: 'outline' | 'solid'
}) {
  return (
    <motion.span
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE_OUT_QUART, delay }}
      className="inline-block"
    >
      <Link
        href={href}
        className={cn(
          'group relative inline-flex min-h-[44px] items-center gap-2 rounded-full border border-dashed px-5 py-2.5 text-[13px] transition-colors duration-300',
          variant === 'outline'
            ? 'border-ink text-ink hover:bg-ink hover:text-cream-soft'
            : 'border-ink bg-ink text-cream-soft hover:bg-transparent hover:text-ink',
        )}
        style={{ letterSpacing: '0.08em' }}
      >
        <span
          aria-hidden
          className={cn(
            'h-[9px] w-[9px] rounded-full transition-colors duration-300',
            variant === 'outline'
              ? 'bg-ink group-hover:bg-cream-soft'
              : 'bg-cream-soft group-hover:bg-ink',
          )}
        />
        <span className="font-label">{children}</span>
      </Link>
    </motion.span>
  )
}

export function Hero() {
  const locale = useLocale()
  const t = useTranslations('hero')
  const tCta = useTranslations('cta')
  const isRtl = locale === 'ar'

  const lines = [
    { text: t('line_1'), style: 'sans' as const },
    { text: t('line_2'), style: 'italic' as const },
    { text: t('line_3'), style: 'sans' as const },
    { text: t('line_4'), style: 'italic' as const },
    { text: t('line_5'), style: 'sans' as const },
  ]

  return (
    <section
      aria-label={t('section_label')}
      className="relative overflow-hidden bg-cream pt-[64px] pb-[var(--spacing-xl)]"
    >
      <div className="container grid items-center gap-[var(--spacing-lg)] md:grid-cols-[1.15fr_1fr] md:gap-[var(--spacing-xl)]">
        <div className="text-start">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_QUART, delay: 0.2 }}
            className="font-label mb-6 inline-block text-ink-muted"
          >
            {t('eyebrow')}
          </motion.span>

          <h1 className="flex flex-col gap-1">
            {lines.map((line, i) => {
              const isArabic = isRtl
              const isItalic = line.style === 'italic' && !isArabic
              return (
                <LineReveal
                  key={i}
                  delay={0.3 + i * 0.09}
                  className={cn(
                    'uppercase',
                    isArabic
                      ? 'text-[clamp(44px,7.5vw,84px)] leading-[1.05]'
                      : 'text-[clamp(40px,6.5vw,92.88px)] leading-[1.02] tracking-[-0.03em]',
                  )}
                >
                  <span
                    style={{
                      fontFamily: isArabic
                        ? 'var(--font-arabic)'
                        : isItalic
                          ? 'var(--font-serif)'
                          : 'var(--font-oswald)',
                      fontStyle: isItalic ? 'italic' : 'normal',
                      fontWeight: isArabic ? 700 : isItalic ? 400 : 600,
                    }}
                  >
                    {line.text}
                  </span>
                </LineReveal>
              )
            })}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              ease: EASE_OUT_QUART,
              delay: 0.9,
            }}
            className="mt-[var(--spacing-md)] max-w-prose text-ink-muted text-[15px] leading-[1.7]"
          >
            {t('description')}
          </motion.p>

          <div className="mt-[var(--spacing-lg)] flex flex-wrap items-center gap-3">
            <CtaPill href="/articles" delay={1.4} variant="outline">
              {tCta('articles')}
            </CtaPill>
            <CtaPill href="/books" delay={1.5} variant="solid">
              {tCta('books')}
            </CtaPill>

            <motion.span
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.4 }}
              className="animate-bob ms-xs inline-block h-[10px] w-[10px] rounded-full bg-ink"
            />
          </div>
        </div>

        {/* REPLACE: real portrait from Dr. Ghattass */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: EASE_IN_OUT_QUART, delay: 0.5 }}
          className="relative mx-auto aspect-[3/4] w-full max-w-[520px]"
        >
          <div className="dotted-outline absolute inset-0 overflow-hidden bg-cream-warm">
            <Image
              src="/dr khaled photo.jpeg"
              alt=""
              fill
              priority
              sizes="(min-width: 768px) 520px, 100vw"
              className="object-cover object-center"
            />
          </div>
          {/* Soft cream feather on the inner edge to match the clone's gradient seam */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cream/80 via-transparent to-transparent rtl:bg-gradient-to-l"
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.5 }}
        className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2"
        aria-hidden
      >
        <span className="animate-bob block h-[10px] w-[10px] rounded-full bg-ink" />
      </motion.div>
    </section>
  )
}
