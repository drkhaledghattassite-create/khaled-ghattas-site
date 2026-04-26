'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { ChapterMark, Ornament } from '@/components/shared/Ornament'
import type { GalleryItem } from '@/lib/db/queries'

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

const CLOCK_POSITIONS = [
  { angle: -90, tilt: -3 },
  { angle: -30, tilt: 5 },
  { angle: 30, tilt: -4 },
  { angle: 90, tilt: 3 },
  { angle: 150, tilt: -3 },
  { angle: -150, tilt: 4 },
]

export function GalleryOrbit({ gallery }: { gallery: GalleryItem[] }) {
  const locale = useLocale()
  const t = useTranslations('gallery')
  const tCta = useTranslations('cta')
  const reduce = useReducedMotion() ?? false
  const isRtl = locale === 'ar'
  const tiles = gallery.slice(0, 6)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const mirror = isRtl ? -1 : 1

  return (
    <section className="relative z-[2] overflow-hidden bg-paper">
      {/* Subtle ledger grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-ink) 1px, transparent 1px), linear-gradient(to bottom, var(--color-ink) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
          maskImage:
            'linear-gradient(to right, transparent 0, black 8%, black 92%, transparent 100%)',
        }}
      />

      {/* Mobile stacked layout */}
      <div className="relative mx-auto max-w-[1280px] px-[var(--section-pad-x)] py-[var(--spacing-xl)] md:hidden">
        <div className="flex flex-col items-center">
          <ChapterMark number=".08" label={isRtl ? 'الأرشيف البصري' : 'Visual Archive'} className="mb-6" />

          <div className="flex aspect-square w-[86vw] flex-col items-center justify-center rounded-full bg-paper-soft px-6 text-center hairline">
            <h2 className="m-0 text-balance">
              <span
                className="block text-garnet"
                style={{
                  fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
                  fontStyle: isRtl ? 'normal' : 'italic',
                  fontWeight: isRtl ? 600 : 400,
                  fontSize: 18,
                  letterSpacing: isRtl ? 0 : '-0.005em',
                }}
              >
                {t('heading.part_1')}
              </span>
              <span
                className="block text-ink"
                style={{
                  fontFamily: isRtl ? 'var(--font-arabic-display)' : 'var(--font-display)',
                  fontWeight: isRtl ? 500 : 400,
                  fontSize: 'clamp(40px, 14vw, 72px)',
                  lineHeight: 1,
                  letterSpacing: isRtl ? 0 : '-0.022em',
                }}
              >
                {t('heading.part_2')}
              </span>
            </h2>
            <div className="mt-5">
              <GalleryCta label={tCta('enter_gallery')} />
            </div>
          </div>

          <div className="mt-10 flex w-full flex-col gap-6">
            {tiles.map((photo, i) => (
              <motion.div
                key={photo.id}
                className="frame-print relative h-[280px] w-full"
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.85, delay: (i % 3) * 0.08, ease: EASE_OUT_QUART }}
              >
                <div className="relative h-full w-full overflow-hidden">
                  <Image src={photo.image} alt="" fill sizes="100vw" className="object-cover duotone-warm" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop orbit */}
      <div className="relative mx-auto hidden h-[920px] w-full max-w-[1440px] overflow-visible md:block">
        <div className="absolute top-[64px] left-1/2 z-30 -translate-x-1/2">
          <ChapterMark number=".08" label={isRtl ? 'الأرشيف البصري' : 'Visual Archive'} />
        </div>

        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 hairline"
          style={{
            width: 1080,
            height: 840,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            willChange: reduce ? undefined : 'transform',
            borderColor: 'rgba(31, 24, 18, 0.32)',
          }}
          animate={reduce ? { rotate: 0 } : { rotate: 360 }}
          transition={
            reduce ? { duration: 0 } : { duration: 80, ease: 'linear', repeat: Infinity }
          }
        />
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 hairline"
          style={{
            width: 1240,
            height: 980,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            willChange: reduce ? undefined : 'transform',
            borderColor: 'rgba(168, 196, 214, 0.5)',
          }}
          animate={reduce ? { rotate: 0 } : { rotate: -360 }}
          transition={
            reduce ? { duration: 0 } : { duration: 80, ease: 'linear', repeat: Infinity }
          }
        />

        <motion.div
          className="absolute left-1/2 top-1/2 flex h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center"
          style={{
            background:
              'radial-gradient(circle, var(--color-paper-soft) 0%, var(--color-paper-warm) 100%)',
            boxShadow: 'inset 0 0 80px rgba(31, 24, 18, 0.06)',
          }}
          initial={{ scale: 0.6, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.0, ease: EASE_OUT_EXPO }}
        >
          <h2 className="m-0 text-balance">
            <span
              className="mb-1 block text-garnet"
              style={{
                fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
                fontStyle: isRtl ? 'normal' : 'italic',
                fontWeight: isRtl ? 600 : 400,
                fontSize: 24,
                letterSpacing: isRtl ? 0 : '-0.005em',
              }}
            >
              {t('heading.part_1')}
            </span>
            <span
              className="pointer-events-none block text-ink"
              style={{
                fontFamily: isRtl ? 'var(--font-arabic-display)' : 'var(--font-display)',
                fontWeight: isRtl ? 500 : 400,
                fontSize: 132,
                lineHeight: 0.92,
                letterSpacing: isRtl ? 0 : '-0.024em',
                whiteSpace: 'nowrap',
              }}
            >
              {t('heading.part_2')}
            </span>
          </h2>
          <div className="mt-7">
            <GalleryCta label={tCta('enter_gallery')} />
          </div>
        </motion.div>

        {tiles.map((photo, i) => {
          const pos = CLOCK_POSITIONS[i]
          const rad = (pos.angle * Math.PI) / 180
          const rX = 540
          const rY = 420
          const x = Math.cos(rad) * rX * mirror
          const y = Math.sin(rad) * rY
          const isHovered = hoveredIdx === i
          const otherHovered = hoveredIdx !== null && !isHovered

          return (
            <motion.div
              key={photo.id}
              className="frame-print absolute left-1/2 top-1/2"
              style={{
                width: 230,
                height: 190,
                zIndex: 5,
                willChange: 'transform, opacity',
                translateX: '-50%',
                translateY: '-50%',
              }}
              initial={{ x: 0, y: 0, scale: 0.5, rotate: 0, opacity: 0 }}
              whileInView={{ x, y, scale: 1, rotate: pos.tilt, opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              animate={
                hoveredIdx !== null
                  ? {
                      x,
                      y,
                      scale: isHovered ? 1.06 : 1,
                      rotate: isHovered ? 0 : pos.tilt,
                      opacity: otherHovered ? 0.55 : 1,
                    }
                  : undefined
              }
              transition={{ duration: 0.85, delay: i * 0.08, ease: EASE_OUT_QUART }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="relative h-full w-full overflow-hidden">
                <Image src={photo.image} alt="" fill sizes="230px" className="object-cover duotone-warm" />
              </div>
            </motion.div>
          )
        })}

        <div className="invisible h-[920px] w-full" aria-hidden />
      </div>

      <div className="container relative pb-[var(--spacing-xl)] flex justify-center">
        <Ornament glyph="arabesque" size={28} className="text-brass animate-flourish-pulse" />
      </div>
    </section>
  )
}

function GalleryCta({ label }: { label: string }) {
  return (
    <Link href="/gallery" className="inline-flex items-center gap-2 px-5 py-[10px] min-h-[42px] rounded-full border border-ink bg-ink text-paper-soft text-[13px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] hover:bg-brass-deep hover:border-brass-deep active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold [dir=rtl]:text-[13.5px]">
      <span aria-hidden className="block h-[7px] w-[7px] rounded-full bg-current" />
      {label}
    </Link>
  )
}
