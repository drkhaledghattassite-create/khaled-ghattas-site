'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { ChapterMark, Ornament } from '@/components/shared/Ornament'
import type { Interview } from '@/lib/db/queries'

const REST_DESKTOP = [
  { x: 280, y: -160, rot: 8 },
  { x: -300, y: -40, rot: -7 },
  { x: 240, y: 100, rot: 5 },
  { x: -260, y: 180, rot: -9 },
  { x: 80, y: 220, rot: 4 },
]

const REST_MOBILE = [
  { x: 80, y: -150, rot: 6 },
  { x: -90, y: -50, rot: -6 },
  { x: 70, y: 70, rot: 5 },
  { x: -80, y: 160, rot: -8 },
  { x: 20, y: 230, rot: 3 },
]

const CARD_WINDOWS: [number, number][] = [
  [0.04, 0.18],
  [0.12, 0.26],
  [0.20, 0.34],
  [0.28, 0.42],
  [0.36, 0.50],
]

/**
 * PRESERVED — sticky scroll version of the interviews section.
 * Kept for potential revival on the /interviews page.
 * Active homepage version is InterviewRotator.tsx (simplified).
 */
export function InterviewRotatorOld({ interviews }: { interviews: Interview[] }) {
  const locale = useLocale()
  const t = useTranslations('interviews')
  const ref = useRef<HTMLElement>(null)
  const isRtl = locale === 'ar'
  const mirror = isRtl ? -1 : 1
  const reduce = useReducedMotion() ?? false
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  const bg = useTransform(
    scrollYProgress,
    [0, 0.25, 1],
    ['#F0E6D8', '#EBDDC9', '#E4D0B7'],
  )
  const ringSize = isMobile ? 360 : 1180
  const ringScale = useTransform(scrollYProgress, [0, 0.75, 1], [1, 1, isMobile ? 0.67 : 0.41])
  const ringRotate = useTransform(scrollYProgress, [0, 1], [-8, -360])
  const ringColor = useTransform(
    scrollYProgress,
    [0, 0.75, 1],
    ['rgba(42,37,40,0.45)', 'rgba(42,37,40,0.45)', 'rgba(168,196,214,1)'],
  )
  const discSize = isMobile ? 280 : 700
  const discScale = useTransform(scrollYProgress, [0, 0.75, 1], [1, 1, isMobile ? 0.71 : 0.54])
  const headingScale = useTransform(scrollYProgress, [0, 0.5, 0.85, 1], [1, 1.32, 1.08, 0.4])
  const headingOpacity = useTransform(scrollYProgress, [0, 0.65, 0.8, 1], [1, 1, 0.2, 0])
  const ctaOpacity = useTransform(scrollYProgress, [0.72, 0.85, 1], [0, 1, 1])
  const ctaScale = useTransform(scrollYProgress, [0.72, 0.85], [0.6, 1])

  const cards = interviews.slice(0, 5)
  const restList = isMobile ? REST_MOBILE : REST_DESKTOP

  return (
    <motion.section
      ref={ref}
      className="relative z-[2] h-[140vh] md:h-[280vh]"
      style={{ backgroundColor: bg }}
    >
      <div className="sticky top-0 flex h-dvh items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute top-[88px] inset-inline-start-0 inset-inline-end-0 z-30 flex justify-center">
          <ChapterMark number=".05" label={isRtl ? 'أصوات وصور' : 'Voices & Frames'} />
        </div>

        <motion.div
          aria-hidden
          className="absolute rounded-full border"
          style={{
            width: ringSize,
            height: ringSize,
            borderColor: ringColor,
            borderStyle: 'solid',
            rotate: reduce ? 0 : ringRotate,
            scale: reduce ? 1 : ringScale,
            willChange: 'transform',
          }}
        />

        <motion.div
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: discSize,
            height: discSize,
            background: 'radial-gradient(circle, var(--color-paper-soft) 0%, var(--color-paper-warm) 100%)',
            boxShadow: 'inset 0 0 60px rgba(31,24,18,0.06)',
            scale: reduce ? 1 : discScale,
            willChange: 'transform',
          }}
        />

        <motion.h2
          className="pointer-events-none absolute z-[5] m-0 px-6 text-balance text-center"
          style={{
            scale: reduce ? 1 : headingScale,
            opacity: reduce ? 1 : headingOpacity,
            willChange: 'transform, opacity',
          }}
        >
          <span
            className="block text-garnet"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
              fontStyle: isRtl ? 'normal' : 'italic',
              fontWeight: isRtl ? 600 : 400,
              fontSize: 'clamp(28px, 6vw, 52px)',
              lineHeight: 1.05,
              letterSpacing: isRtl ? 0 : '-0.005em',
            }}
          >
            {t('heading.part_1')}
          </span>
          <span
            className="mt-2 block text-ink"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic-display)' : 'var(--font-display)',
              fontWeight: isRtl ? 500 : 400,
              fontSize: 'clamp(30px, 7vw, 60px)',
              letterSpacing: isRtl ? 0 : '-0.022em',
              lineHeight: 0.96,
            }}
          >
            {t('heading.part_2')}
          </span>
        </motion.h2>

        {cards.map((interview, i) => (
          <InterviewCard
            key={interview.id}
            interview={interview}
            index={i}
            rest={restList[i]}
            window={CARD_WINDOWS[i]}
            scrollYProgress={scrollYProgress}
            mirror={mirror}
            locale={locale}
            isMobile={isMobile}
            reduce={reduce}
          />
        ))}

        <motion.div
          className="absolute flex items-center justify-center rounded-full"
          style={{
            width: 280,
            height: 280,
            background:
              'radial-gradient(circle, var(--color-brass) 0%, var(--color-brass-deep) 100%)',
            opacity: reduce ? 1 : ctaOpacity,
            scale: reduce ? 1 : ctaScale,
            zIndex: 30,
            willChange: 'opacity, transform',
            boxShadow:
              'inset 0 0 0 2px rgba(244,236,216,0.18), 0 18px 60px -28px rgba(31,24,18,0.5)',
          }}
        >
          <Link href="/interviews" className="absolute inset-0" aria-label={t('badge')} />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            animate={reduce ? { rotate: 0 } : { rotate: 360 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 22, repeat: Infinity, ease: 'linear' }
            }
          >
            <StampText text={t('stamp_text')} isRtl={isRtl} />
          </motion.div>
          <span
            className="pointer-events-none relative text-paper-soft"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic-display)' : 'var(--font-display)',
              fontWeight: isRtl ? 500 : 400,
              fontStyle: isRtl ? 'normal' : 'italic',
              fontSize: 30,
              letterSpacing: isRtl ? 0 : '-0.005em',
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
        <path id="stamp-circle-old" d="M 140, 140 m -110, 0 a 110,110 0 1,1 220,0 a 110,110 0 1,1 -220,0" />
      </defs>
      <text
        fill="rgba(244,236,216,0.92)"
        style={{
          fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
          fontStyle: isRtl ? 'normal' : 'italic',
          fontWeight: isRtl ? 600 : 400,
          fontSize: 18,
          letterSpacing: isRtl ? '1px' : '5px',
          textTransform: isRtl ? 'none' : 'uppercase',
        }}
      >
        <textPath href="#stamp-circle-old" startOffset="0">
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
  isMobile,
  reduce,
}: {
  interview: Interview
  index: number
  rest: { x: number; y: number; rot: number }
  window: [number, number]
  scrollYProgress: MotionValue<number>
  mirror: 1 | -1
  locale: string
  isMobile: boolean
  reduce: boolean
}) {
  const [start, end] = win
  const exitStart = 0.78
  const exitEnd = 0.92
  const offscreen = isMobile ? 360 : 620
  const startX = (index % 2 === 0 ? offscreen : -offscreen) * mirror
  const restX = rest.x * mirror
  const restRot = rest.rot
  const startRot = restRot + (index % 2 === 0 ? 18 : -18)

  const x = useTransform(
    scrollYProgress,
    [start, end, exitStart, exitEnd],
    [startX, restX, restX, restX * 0.4],
  )
  const y = useTransform(scrollYProgress, [start, end, exitEnd], [0, rest.y, rest.y - 60])
  const rot = useTransform(scrollYProgress, [start, end], [startRot, restRot])
  const scale = useTransform(scrollYProgress, [start, end], [0.85, 1])
  const opacity = useTransform(
    scrollYProgress,
    [start, start + 0.04, exitStart, exitEnd],
    [0, 1, 1, 0],
  )

  const title = locale === 'ar' ? interview.titleAr : interview.titleEn
  const excerpt = (locale === 'ar' ? interview.descriptionAr : interview.descriptionEn) ?? ''
  const cardWidth = isMobile ? 220 : 300

  return (
    <motion.div
      className="frame-print absolute"
      style={{
        x: reduce ? restX : x,
        y: reduce ? rest.y : y,
        rotate: reduce ? restRot : rot,
        scale: reduce ? 1 : scale,
        opacity: reduce ? 1 : opacity,
        zIndex: 10 + index,
        width: cardWidth,
        willChange: 'transform, opacity',
      }}
    >
      <Link href="/interviews" className="block">
        <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden">
          <Image
            src={interview.thumbnailImage}
            alt=""
            fill
            sizes="(max-width: 767px) 200px, 280px"
            className="object-cover duotone-warm"
          />
          <span aria-hidden className="absolute end-1.5 top-1.5 text-paper-soft/85">
            <Ornament glyph="asterism" size={11} />
          </span>
        </div>
        <h3
          className="px-2 text-ink"
          style={{
            fontFamily: locale === 'ar' ? 'var(--font-arabic-display)' : 'var(--font-display)',
            fontWeight: 500,
            fontSize: 16,
            lineHeight: 1.2,
            letterSpacing: locale === 'ar' ? 0 : '-0.012em',
          }}
        >
          {title}
        </h3>
        <p
          className="mt-1.5 px-2 pb-2 text-ink-soft"
          style={{
            fontFamily: locale === 'ar' ? 'var(--font-arabic)' : 'var(--font-serif)',
            fontStyle: locale === 'ar' ? 'normal' : 'italic',
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          {excerpt}
        </p>
      </Link>
    </motion.div>
  )
}
