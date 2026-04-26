'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

const MEDIA_LOGOS = [
  { key: 'bbc',       ar: 'BBC عربي',          en: 'BBC Arabic'      },
  { key: 'aljazeera', ar: 'الجزيرة',            en: 'Al Jazeera'      },
  { key: 'skynews',   ar: 'سكاي نيوز عربية',   en: 'Sky News Arabia'  },
  { key: 'lbc',       ar: 'LBC',               en: 'LBC'             },
  { key: 'alarabiya', ar: 'العربية',            en: 'Al Arabiya'      },
]

function CountUp({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number>(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        obs.disconnect()
        const duration = 1200
        const startTime = performance.now()
        const tick = (now: number) => {
          const progress = Math.min((now - startTime) / duration, 1)
          const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
          setCount(Math.round(eased * target))
          if (progress < 1) {
            rafRef.current = requestAnimationFrame(tick)
          }
        }
        rafRef.current = requestAnimationFrame(tick)
      },
      { threshold: 0.5 },
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [target])

  return (
    <span ref={ref} className="num-latn">
      {count}
    </span>
  )
}

export function AboutTeaser() {
  const locale = useLocale()
  const t = useTranslations('about_teaser')
  const tStats = useTranslations('stats')
  const isRtl = locale === 'ar'

  const stats = [
    { target: 15,   label: t('stats.years_label')    },
    { target: 1000, label: t('stats.lectures_label') },
    { target: 5,    label: t('stats.books_label')    },
  ]

  return (
    <section className="relative z-[2] bg-paper px-[var(--section-pad-x)] py-20 md:py-[120px] lg:py-40">
      <div className="mx-auto max-w-[680px] flex flex-col items-center gap-10 text-center">

        {/* Portrait */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: EASE_OUT_QUART }}
        >
          <div
            className="relative overflow-hidden rounded-full w-40 h-40 ring-1 ring-sky"
          >
            <Image
              src="/dr-khaled-portrait.jpg"
              alt={isRtl ? 'د. خالد غطاس' : 'Dr. Khaled Ghattass'}
              fill
              sizes="160px"
              className="object-cover object-top"
            />
          </div>
        </motion.div>

        {/* Stats — horizontal row */}
        <div className="flex w-full items-start justify-center gap-6 sm:gap-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, ease: EASE_OUT_QUART, delay: i * 0.08 }}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className="num-latn font-display font-bold text-[clamp(40px,8vw,64px)] leading-none tracking-[-0.02em] text-sky-deep"
              >
                +<CountUp target={stat.target} />
              </div>
              <div
                className="font-display font-medium text-[11px] tracking-[0.12em] uppercase text-ink-muted [dir=rtl]:font-arabic [dir=rtl]:text-[13px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bio */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: EASE_OUT_QUART, delay: 0.1 }}
          className="text-ink text-pretty font-serif italic text-[18px] leading-[1.85] [dir=rtl]:font-arabic [dir=rtl]:not-italic"
        >
          {tStats('bio')}
        </motion.p>

        {/* Media logos */}
        <div className="flex flex-col items-center gap-4 w-full">
          <p
            className="font-display font-medium text-[11px] tracking-[0.16em] uppercase text-ink-muted [dir=rtl]:font-arabic [dir=rtl]:font-semibold [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
          >
            {t('featured_on.heading')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {MEDIA_LOGOS.map((logo, i) => (
              <motion.span
                key={logo.key}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 0.65 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: EASE_OUT_QUART }}
                className="font-display font-medium text-[12px] tracking-[0.06em] uppercase text-ink [dir=rtl]:font-arabic [dir=rtl]:font-semibold [dir=rtl]:text-[13px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
              >
                {isRtl ? logo.ar : logo.en}
              </motion.span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: EASE_OUT_QUART, delay: 0.2 }}
        >
          <Link href="/about" className="inline-flex items-center gap-2 px-5 py-[10px] min-h-[42px] rounded-full border border-ink bg-transparent text-ink text-[13px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] hover:bg-ink hover:text-paper-soft active:translate-y-px [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold [dir=rtl]:text-[13.5px]">
            <span aria-hidden className="block h-[7px] w-[7px] rounded-full bg-current" />
            {tStats('cta')}
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
