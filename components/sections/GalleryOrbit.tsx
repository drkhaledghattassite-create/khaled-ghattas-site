'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import type { GalleryItem } from '@/lib/db/queries'

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

const CLOCK_POSITIONS = [
  { angle: -90, tilt: -3 }, // 12
  { angle: -30, tilt: 6 }, // 2
  { angle: 30, tilt: -5 }, // 4
  { angle: 90, tilt: 2 }, // 6
  { angle: 150, tilt: -4 }, // 8
  { angle: -150, tilt: 5 }, // 10
]

export function GalleryOrbit({ gallery }: { gallery: GalleryItem[] }) {
  const locale = useLocale()
  const t = useTranslations('gallery')
  const tCta = useTranslations('cta')
  const isRtl = locale === 'ar'
  const tiles = gallery.slice(0, 6)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const mirror = isRtl ? -1 : 1

  return (
    <section className="relative z-[2] overflow-hidden bg-cream">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #252321 1px, transparent 1px), linear-gradient(to bottom, #252321 1px, transparent 1px)',
          backgroundSize: '104px 104px',
          maskImage:
            'linear-gradient(to right, transparent 0, black 8%, black 92%, transparent 100%)',
        }}
      />

      {/* Mobile stacked layout */}
      <div className="relative mx-auto max-w-[1440px] px-[var(--spacing-md)] py-[var(--spacing-xl)] md:hidden">
        <div className="flex flex-col items-center">
          <div className="flex aspect-square w-[86vw] flex-col items-center justify-center rounded-full bg-cream-soft px-6 text-center">
            <p
              className="uppercase text-ink"
              style={{
                fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
                fontStyle: isRtl ? 'normal' : 'italic',
                fontWeight: isRtl ? 600 : 400,
                fontSize: 18,
                letterSpacing: isRtl ? 'normal' : '1px',
              }}
            >
              {t('heading.part_1')}
            </p>
            <p
              className="uppercase text-ink"
              style={{
                fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
                fontStyle: isRtl ? 'normal' : 'italic',
                fontWeight: isRtl ? 700 : 400,
                fontSize: 'clamp(40px, 14vw, 72px)',
                lineHeight: 1,
                letterSpacing: isRtl ? 'normal' : '-1px',
              }}
            >
              {t('heading.part_2')}
            </p>
            <div className="mt-5">
              <GalleryCta label={tCta('enter_gallery')} />
            </div>
          </div>
          <div className="mt-10 flex w-full flex-col gap-6">
            {tiles.map((photo, i) => (
              <motion.div
                key={photo.id}
                className="relative h-[280px] w-full overflow-hidden border border-dashed border-ink/50 bg-cream-soft p-[6px]"
                initial={{ y: 40, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.8, delay: (i % 3) * 0.08, ease: EASE_OUT_QUART }}
              >
                <div className="relative h-full w-full overflow-hidden">
                  <Image src={photo.image} alt="" fill sizes="100vw" className="object-cover" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop orbit */}
      <div className="relative mx-auto hidden h-[900px] w-full max-w-[1440px] overflow-visible md:block">
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 border border-dashed border-ink/55"
          style={{ width: 1080, height: 840, borderRadius: '50%', transform: 'translate(-50%, -50%)', willChange: 'transform' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, ease: 'linear', repeat: Infinity }}
        />
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 border border-dashed border-ink/35"
          style={{ width: 1220, height: 960, borderRadius: '50%', transform: 'translate(-50%, -50%)', willChange: 'transform' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 60, ease: 'linear', repeat: Infinity }}
        />

        <motion.div
          className="absolute left-1/2 top-1/2 flex h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-cream-soft text-center"
          initial={{ scale: 0.4, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
        >
          <p
            className="mb-2 uppercase text-ink"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
              fontStyle: isRtl ? 'normal' : 'italic',
              fontWeight: isRtl ? 600 : 400,
              fontSize: 22,
              letterSpacing: isRtl ? 'normal' : '2px',
            }}
          >
            {t('heading.part_1')}
          </p>
          <p
            className="pointer-events-none uppercase text-ink"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
              fontStyle: isRtl ? 'normal' : 'italic',
              fontWeight: isRtl ? 700 : 400,
              fontSize: 136,
              lineHeight: 0.9,
              letterSpacing: isRtl ? 'normal' : '-2px',
              whiteSpace: 'nowrap',
            }}
          >
            {t('heading.part_2')}
          </p>
          <div className="mt-6">
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
              className="absolute left-1/2 top-1/2 border border-dashed border-ink/60 bg-cream-soft p-[8px]"
              style={{
                width: 220,
                height: 180,
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
                      opacity: otherHovered ? 0.6 : 1,
                    }
                  : undefined
              }
              transition={{ duration: 0.8, delay: i * 0.08, ease: EASE_OUT_QUART }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="relative h-full w-full overflow-hidden">
                <Image src={photo.image} alt="" fill sizes="220px" className="object-cover" />
              </div>
            </motion.div>
          )
        })}

        <div className="invisible h-[900px] w-full" aria-hidden />
      </div>
    </section>
  )
}

function GalleryCta({ label }: { label: string }) {
  return (
    <Link
      href="/gallery"
      className="group relative inline-flex items-center gap-2 rounded-full border border-dashed border-ink bg-cream-soft px-4 py-2 text-[13px] text-ink transition-colors duration-300 hover:bg-ink hover:text-cream-soft"
      style={{ letterSpacing: '0.08em' }}
    >
      <span aria-hidden className="h-[9px] w-[9px] rounded-full bg-ink transition-colors duration-300 group-hover:bg-cream-soft" />
      <span className="font-label">{label}</span>
    </Link>
  )
}
