'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'motion/react'
import { useLocale } from 'next-intl'
import { useReducedMotion } from '@/lib/motion/hooks'

type CountUpProps = {
  to: number
  from?: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  format?: (n: number, locale: string) => string
  decimals?: number
}

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

export function CountUp({
  to,
  from = 0,
  duration = 1.4,
  prefix = '',
  suffix = '',
  className,
  format,
  decimals = 0,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })
  const reduceMotion = useReducedMotion()
  const locale = useLocale()
  const [value, setValue] = useState(from)

  useEffect(() => {
    if (!inView) return
    if (reduceMotion) {
      setValue(to)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000
      const progress = Math.min(1, elapsed / duration)
      const eased = easeOutExpo(progress)
      const current = from + (to - from) * eased
      setValue(decimals === 0 ? Math.round(current) : Math.round(current * 10 ** decimals) / 10 ** decimals)
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, from, duration, reduceMotion, decimals])

  const formatted = format
    ? format(value, locale)
    : new Intl.NumberFormat(locale, { maximumFractionDigits: decimals }).format(value)

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
