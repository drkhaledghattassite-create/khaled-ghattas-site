'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react'
import { useReducedMotion } from '@/lib/motion/hooks'

type PullQuoteProps = {
  children: ReactNode
  /** Optional attribution shown beneath the quote in muted small caps. */
  attribution?: string
  className?: string
}

/**
 * Editorial pull-quote with scroll-velocity blur.
 *  - At rest (slow scroll): the quote sits proudly with a soft drop shadow.
 *  - During fast scrolling: the quote blurs slightly, signaling that the
 *    reader is moving past it; the moment they slow down, it settles back.
 *  - Combined with a scroll-linked rise (translateY) tied to the section's
 *    own scroll progress so it feels lifted off the page.
 */
export function PullQuote({ children, attribution, className }: PullQuoteProps) {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const { scrollY } = useScroll()
  const velocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(velocity, { stiffness: 250, damping: 28 })

  const blurValue = useTransform(smoothVelocity, (v) => {
    if (reduce) return 0
    const abs = Math.min(Math.abs(v) / 1400, 1) // 0..1
    return abs * 4 // up to 4px blur
  })
  const filter = useTransform(blurValue, (b) => (b > 0.05 ? `blur(${b.toFixed(2)}px)` : 'none'))

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.95', 'end 0.05'],
  })
  const lift = useTransform(scrollYProgress, [0, 0.5, 1], [12, -4, -10])
  const liftSmooth = useSpring(lift, { stiffness: 100, damping: 26, mass: 0.8 })
  const lift0 = useMotionValue(0)

  return (
    <motion.figure
      ref={ref}
      style={{
        filter: mounted && !reduce ? filter : undefined,
        y: mounted && !reduce ? liftSmooth : lift0,
      }}
      className={`m-0 my-[clamp(40px,5vw,72px)] mx-auto max-w-[760px] ${className ?? ''}`}
    >
      <div className="relative ps-[clamp(20px,3vw,32px)] [box-shadow:none]">
        <span
          aria-hidden
          className="absolute inset-y-2 inset-inline-start-0 w-[3px] bg-[var(--color-accent)]"
        />
        <blockquote className="m-0">
          <p className="m-0 text-[clamp(22px,2.6vw,32px)] leading-[1.4] font-medium tracking-[-0.005em] text-[var(--color-fg1)] [text-wrap:pretty] font-arabic-display">
            {children}
          </p>
        </blockquote>
        {attribution && (
          <figcaption className="mt-4 inline-flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] before:content-[''] before:w-5 before:h-px before:bg-[var(--color-border-strong)] before:inline-block font-display">
            {attribution}
          </figcaption>
        )}
      </div>
    </motion.figure>
  )
}
