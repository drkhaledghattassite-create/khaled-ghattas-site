'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import type { Interview } from '@/lib/db/queries'

const REST = [
  { x: 200, y: -80, rot: 10 },
  { x: -210, y: -20, rot: -10 },
  { x: 160, y: 80, rot: 6 },
  { x: -180, y: 120, rot: -12 },
  { x: 60, y: 160, rot: 4 },
]

const CARD_WINDOWS: [number, number][] = [
  [0.06, 0.22],
  [0.18, 0.34],
  [0.30, 0.46],
  [0.42, 0.58],
  [0.54, 0.70],
]

/**
 * Interviews — FULL_AUDIT.md §6. Sticky scroll, bg cream → pink-cream.
 * Dashed outer ring shrinks and tints amber at end. 5 cards fly in at
 * scroll thresholds. Final rotating stamp CTA.
 */
export function InterviewRotator({ interviews }: { interviews: Interview[] }) {
  const locale = useLocale()
  const t = useTranslations('interviews')
  const ref = useRef<HTMLElement>(null)
  const isRtl = locale === 'ar'
  const mirror = isRtl ? -1 : 1

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  const bg = useTransform(scrollYProgress, [0, 0.2, 1], ['#EDE7DF', '#EDDBD5', '#EDDBD5'])
  const ringWidth = useTransform(scrollYProgress, [0, 0.75, 1], [1160, 1160, 460])
  const ringRotate = useTransform(scrollYProgress, [0, 1], [-8.83, -360])
  const ringColor = useTransform(
    scrollYProgress,
    [0, 0.75, 1],
    ['rgba(37,35,33,0.75)', 'rgba(37,35,33,0.75)', 'rgba(188,136,74,1)'],
  )
  const discWidth = useTransform(scrollYProgress, [0, 0.75, 1], [680, 680, 360])
  const headingScale = useTransform(scrollYProgress, [0, 0.5, 0.85, 1], [1, 1.7, 1.2, 0.4])
  const headingOpacity = useTransform(scrollYProgress, [0, 0.65, 0.8, 1], [1, 1, 0.2, 0])
  const ctaOpacity = useTransform(scrollYProgress, [0.72, 0.85, 1], [0, 1, 1])
  const ctaScale = useTransform(scrollYProgress, [0.72, 0.85], [0.6, 1])

  const cards = interviews.slice(0, 5)

  return (
    <motion.section
      ref={ref}
      className="relative z-[2] h-[320vh] md:h-[420vh]"
      style={{ backgroundColor: bg }}
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <motion.div
          aria-hidden
          className="absolute rounded-full border border-dashed"
          style={{
            width: ringWidth,
            height: ringWidth,
            borderColor: ringColor,
            rotate: ringRotate,
            willChange: 'transform, width',
          }}
        />

        <motion.div
          className="absolute rounded-full bg-cream-soft"
          style={{ width: discWidth, height: discWidth, willChange: 'width, height' }}
        />

        <motion.div
          className="pointer-events-none absolute z-[5] text-center"
          style={{ scale: headingScale, opacity: headingOpacity, willChange: 'transform, opacity' }}
        >
          <p
            className="uppercase text-ink"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
              fontStyle: isRtl ? 'normal' : 'italic',
              fontWeight: isRtl ? 700 : 400,
              fontSize: 44,
              lineHeight: 1.05,
              letterSpacing: isRtl ? 'normal' : '-1px',
            }}
          >
            {t('heading.part_1')}
          </p>
          <p
            className="uppercase text-ink"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
              fontWeight: 700,
              fontSize: 48,
              letterSpacing: isRtl ? 'normal' : '-1.5px',
              lineHeight: 1,
            }}
          >
            {t('heading.part_2')}
          </p>
        </motion.div>

        {cards.map((interview, i) => (
          <InterviewCard
            key={interview.id}
            interview={interview}
            index={i}
            rest={REST[i]}
            window={CARD_WINDOWS[i]}
            scrollYProgress={scrollYProgress}
            mirror={mirror}
            locale={locale}
          />
        ))}

        <motion.div
          className="absolute flex items-center justify-center rounded-full bg-amber"
          style={{
            width: 280,
            height: 280,
            opacity: ctaOpacity,
            scale: ctaScale,
            zIndex: 30,
            willChange: 'opacity, transform',
          }}
        >
          <Link href="/interviews" className="absolute inset-0" aria-label={t('badge')} />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          >
            <StampText text={t('stamp_text')} isRtl={isRtl} />
          </motion.div>
          <span
            className="pointer-events-none relative uppercase text-cream"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: isRtl ? 'normal' : '-1px',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            {t('badge_short')}
          </span>
        </motion.div>
      </div>
    </motion.section>
  )
}

function StampText({ text, isRtl }: { text: string; isRtl: boolean }) {
  return (
    <svg viewBox="0 0 280 280" width="100%" height="100%">
      <defs>
        <path id="stamp-circle" d="M 140, 140 m -110, 0 a 110,110 0 1,1 220,0 a 110,110 0 1,1 -220,0" />
      </defs>
      <text
        fill="#EDE7DF"
        style={{
          fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
          fontStyle: isRtl ? 'normal' : 'italic',
          fontWeight: isRtl ? 700 : 400,
          fontSize: 20,
          letterSpacing: isRtl ? '0px' : '4px',
          textTransform: 'uppercase',
        }}
      >
        <textPath href="#stamp-circle" startOffset="0">
          {text}&nbsp;
        </textPath>
      </text>
    </svg>
  )
}

function InterviewCard({
  interview,
  index,
  rest,
  window: win,
  scrollYProgress,
  mirror,
  locale,
}: {
  interview: Interview
  index: number
  rest: { x: number; y: number; rot: number }
  window: [number, number]
  scrollYProgress: MotionValue<number>
  mirror: 1 | -1
  locale: string
}) {
  const [start, end] = win
  const exitStart = 0.72
  const exitEnd = 0.82
  const startX = (index % 2 === 0 ? 620 : -620) * mirror
  const restX = rest.x * mirror
  const restRot = rest.rot
  const startRot = restRot + (index % 2 === 0 ? 18 : -18)

  const x = useTransform(
    scrollYProgress,
    [start, end, exitStart, exitEnd],
    [startX, restX, restX, restX * 0.4],
  )
  const y = useTransform(scrollYProgress, [start, end, exitEnd], [0, rest.y, rest.y - 80])
  const rot = useTransform(scrollYProgress, [start, end], [startRot, restRot])
  const scale = useTransform(scrollYProgress, [start, end], [0.85, 1])
  const opacity = useTransform(
    scrollYProgress,
    [start, start + 0.02, exitStart, exitEnd],
    [0, 1, 1, 0],
  )

  const title = locale === 'ar' ? interview.titleAr : interview.titleEn
  const excerpt = (locale === 'ar' ? interview.descriptionAr : interview.descriptionEn) ?? ''

  return (
    <motion.div
      className="absolute border border-dashed border-ink/60 bg-cream-soft"
      style={{
        x,
        y,
        rotate: rot,
        scale,
        opacity,
        zIndex: 10 + index,
        width: 300,
        padding: 10,
        willChange: 'transform, opacity',
      }}
    >
      <Link href={`/interviews`} className="block">
        <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden">
          <Image src={interview.thumbnailImage} alt="" fill sizes="320px" className="object-cover" />
        </div>
        <h3
          className="px-2 uppercase text-ink"
          style={{
            fontFamily: locale === 'ar' ? 'var(--font-arabic)' : 'var(--font-oswald)',
            fontWeight: 600,
            fontSize: 16,
            lineHeight: 1.2,
            letterSpacing: locale === 'ar' ? 'normal' : '-0.5px',
          }}
        >
          {title}
        </h3>
        <p
          className="mt-2 px-2 pb-2 text-ink/80"
          style={{
            fontFamily: locale === 'ar' ? 'var(--font-arabic)' : 'var(--font-serif)',
            fontStyle: locale === 'ar' ? 'normal' : 'italic',
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          {excerpt}
        </p>
      </Link>
    </motion.div>
  )
}
