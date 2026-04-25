'use client'

import Image from 'next/image'
import { useCallback, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

type Slide = { src: string; caption: string }

type Props = {
  open: boolean
  slides: Slide[]
  index: number
  onClose: () => void
  onIndex: (next: number) => void
}

export function Lightbox({ open, slides, index, onClose, onIndex }: Props) {
  const locale = useLocale()
  const t = useTranslations('common')
  const isRtl = locale === 'ar'
  const count = slides.length

  const next = useCallback(
    () => onIndex((index + 1) % count),
    [index, count, onIndex],
  )
  const prev = useCallback(
    () => onIndex((index - 1 + count) % count),
    [index, count, onIndex],
  )

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') (isRtl ? prev : next)()
      else if (e.key === 'ArrowLeft') (isRtl ? next : prev)()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isRtl, onClose, next, prev])

  const slide = slides[index]

  return (
    <AnimatePresence>
      {open && slide && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-ink/90 p-6"
          role="dialog"
          aria-modal="true"
          aria-label={t('lightbox')}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="absolute end-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-cream-soft text-cream-soft transition-colors hover:bg-cream-soft hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>

          <div className="relative w-full max-w-[1100px] flex-1">
            <div className="relative h-full w-full">
              <Image
                src={slide.src}
                alt={slide.caption}
                fill
                sizes="(min-width: 768px) 90vw, 100vw"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <p className="mt-4 max-w-prose text-center text-[14px] text-cream-soft">
            {slide.caption}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={prev}
              aria-label={t('previous')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-cream-soft text-cream-soft transition-colors hover:bg-cream-soft hover:text-ink"
            >
              {isRtl ? <ChevronRight className="h-5 w-5" aria-hidden /> : <ChevronLeft className="h-5 w-5" aria-hidden />}
            </button>
            <span className="font-label text-[12px] text-cream-soft">
              {index + 1} / {count}
            </span>
            <button
              type="button"
              onClick={next}
              aria-label={t('next')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-cream-soft text-cream-soft transition-colors hover:bg-cream-soft hover:text-ink"
            >
              {isRtl ? <ChevronLeft className="h-5 w-5" aria-hidden /> : <ChevronRight className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
