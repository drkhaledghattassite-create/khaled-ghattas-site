'use client'

import { motion } from 'motion/react'
import { EASE_EDITORIAL, staggerItem } from '@/lib/motion/variants'

type Props = {
  label: string
  value: number | string
  variant?: 'number' | 'currency'
}

export function AnalyticsStatCard({ label, value }: Props) {
  return (
    <motion.div
      variants={staggerItem}
      transition={{ duration: 0.45, ease: EASE_EDITORIAL }}
      className="rounded-md border border-border bg-bg-elevated p-4"
    >
      <p className="text-[10px] uppercase tracking-[0.1em] text-fg3 font-display font-semibold">
        {label}
      </p>
      <p className="mt-2 text-fg1 font-display font-semibold text-[28px] tracking-[-0.02em] [font-feature-settings:'tnum']">
        {value}
      </p>
    </motion.div>
  )
}
