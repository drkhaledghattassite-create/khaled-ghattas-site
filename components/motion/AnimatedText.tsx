'use client'

import type { ElementType } from 'react'
import { motion } from 'motion/react'
import { EASE_EDITORIAL } from '@/lib/motion/variants'
import { useReducedMotion } from '@/lib/motion/hooks'

type AnimatedTextProps = {
  text: string
  as?: ElementType
  className?: string
  /** Granularity of the reveal. */
  by?: 'word' | 'char'
  /** Stagger delay between segments (seconds). */
  stagger?: number
  /** Initial delay (seconds) before reveal begins. */
  delay?: number
  /** Duration of each segment's fade-up (seconds). */
  duration?: number
  /** Animate in view or on mount. */
  inView?: boolean
  /** Margin for inView trigger. */
  margin?: string
}

export function AnimatedText({
  text,
  as,
  className,
  by = 'word',
  stagger = 0.04,
  delay = 0,
  duration = 0.6,
  inView = true,
  margin = '-15%',
}: AnimatedTextProps) {
  const Tag = (as ?? 'span') as ElementType
  const reduceMotion = useReducedMotion()

  // Short-circuit under reduced-motion: render plain text, no per-segment
  // motion shells, no transforms, no opacity ramp.
  if (reduceMotion) {
    return <Tag className={className}>{text}</Tag>
  }

  const segments = by === 'word' ? text.split(/(\s+)/) : Array.from(text)

  const container = {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  }
  const item = {
    hidden: { opacity: 0, y: '0.4em' },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration, ease: EASE_EDITORIAL },
    },
  }

  return (
    <Tag className={className}>
      <motion.span
        initial="hidden"
        whileInView={inView ? 'visible' : undefined}
        animate={inView ? undefined : 'visible'}
        viewport={inView ? { once: true, margin } : undefined}
        variants={container}
        style={{ display: 'inline-block' }}
      >
        {segments.map((seg, i) => {
          if (/^\s+$/.test(seg)) {
            return <span key={`s-${i}`}>{seg}</span>
          }
          return (
            <motion.span
              key={`${seg}-${i}`}
              variants={item}
              style={{ display: 'inline-block', willChange: 'transform' }}
            >
              {seg}
            </motion.span>
          )
        })}
      </motion.span>
    </Tag>
  )
}
