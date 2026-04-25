'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useLocale } from 'next-intl'
import { motion } from 'motion/react'
import { Lightbox } from '@/components/shared/Lightbox'
import type { GalleryItem } from '@/lib/db/queries'

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

export function GalleryMasonry({ gallery }: { gallery: GalleryItem[] }) {
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const slides = gallery.map((p) => ({
    src: p.image,
    caption: (locale === 'ar' ? p.titleAr : p.titleEn) ?? '',
  }))

  return (
    <section className="relative z-[2] bg-paper px-[var(--section-pad-x)] py-[var(--spacing-lg)]">
      <div className="mx-auto max-w-[1280px]">
        <div className="columns-2 gap-5 md:columns-3 lg:columns-4 [&>*]:mb-5 [&>*]:break-inside-avoid">
          {gallery.map((photo, i) => {
            const rot = ((i * 7) % 7) - 3
            const height = 220 + ((i * 37) % 180)
            const caption = (locale === 'ar' ? photo.titleAr : photo.titleEn) ?? ''
            return (
              <motion.button
                key={photo.id}
                type="button"
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.1 }}
                whileHover={{ scale: 1.03, rotate: 0 }}
                transition={{ duration: 0.7, delay: (i % 8) * 0.06, ease: EASE_OUT_QUART }}
                style={{ transform: `rotate(${rot}deg)` }}
                className="frame-print relative block w-full"
                onClick={() => {
                  setActiveIndex(i)
                  setOpen(true)
                }}
                aria-label={caption}
              >
                <div style={{ height }} className="relative w-full overflow-hidden">
                  <Image
                    src={photo.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    className="object-cover duotone-warm"
                  />
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      <Lightbox
        open={open}
        slides={slides}
        index={activeIndex}
        onClose={() => setOpen(false)}
        onIndex={setActiveIndex}
      />
    </section>
  )
}
