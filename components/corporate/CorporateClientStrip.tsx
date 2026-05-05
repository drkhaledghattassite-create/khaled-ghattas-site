'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import type { CorporateClient } from '@/lib/db/queries'
import {
  EASE_EDITORIAL,
  staggerContainerWith,
  staggerItem,
} from '@/lib/motion/variants'

type Props = {
  clients: CorporateClient[]
}

/**
 * Single logo cell. Owns its own error state so a 404 on one logo swaps to
 * a text fallback without affecting siblings. Real client PNGs are not yet
 * shipped at /clients/<slug>.png — until they are, every cell will fall
 * through to the text label.
 */
function ClientLogo({
  label,
  logoUrl,
  isRtl,
}: {
  label: string
  logoUrl: string | null
  isRtl: boolean
}) {
  const [errored, setErrored] = useState(false)
  const showImage = !!logoUrl && !errored

  return (
    <div className="flex h-12 w-full items-center justify-center">
      {showImage ? (
        <Image
          src={logoUrl}
          alt={label}
          width={140}
          height={48}
          onError={() => setErrored(true)}
          className="h-10 w-auto max-w-[140px] object-contain opacity-60 grayscale transition-[opacity,filter] duration-300 hover:opacity-100 hover:grayscale-0"
        />
      ) : (
        <span
          className={`text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--color-fg3)] ${
            isRtl
              ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case'
              : 'font-display'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  )
}

/**
 * Trust strip — a quiet row of client/partner logos sitting under the hero.
 * Logos are kept neutral (grayscale + low opacity, lifting on hover) so they
 * read as a backdrop, not a sponsor wall. Falls back to text when an image
 * fails to load.
 */
export function CorporateClientStrip({ clients }: Props) {
  const t = useTranslations('corporate.trust')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  if (clients.length === 0) return null

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      className="border-b border-[var(--color-border)] [padding:clamp(48px,6vw,80px)_clamp(20px,5vw,56px)] bg-[var(--color-bg)]"
    >
      <div className="mx-auto max-w-[var(--container-max)]">
        <header className="mb-8 flex flex-col items-center gap-2 text-center">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.5, ease: EASE_EDITORIAL }}
            className="section-eyebrow"
          >
            {t('eyebrow')}
          </motion.span>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.6, ease: EASE_EDITORIAL, delay: 0.08 }}
            className={`m-0 max-w-[58ch] text-[14px] leading-[1.7] text-[var(--color-fg3)] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('subheading')}
          </motion.p>
        </header>

        <motion.ul
          variants={staggerContainerWith(0.05, 0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-10%' }}
          className="m-0 list-none p-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 items-center gap-x-8 gap-y-10"
        >
          {clients.map((c) => {
            const labelLocalized = isRtl ? c.nameAr ?? c.name : c.name
            const inner = (
              <ClientLogo
                label={labelLocalized}
                logoUrl={c.logoUrl}
                isRtl={isRtl}
              />
            )
            return (
              <motion.li key={c.id} variants={staggerItem} className="flex items-center justify-center">
                {c.websiteUrl ? (
                  <a
                    href={c.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={labelLocalized}
                    className="block w-full"
                  >
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </motion.li>
            )
          })}
        </motion.ul>
      </div>
    </section>
  )
}
