'use client'

import { useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useReducedMotion } from '@/lib/motion/hooks'

type ScrollRevealProps = {
  children: string
  as?: ElementType
  className?: string
  /** Tighter range = quicker reveal; wider = slower reading-guide pace. */
  offset?: [string, string]
  /** Opacity of the un-revealed (dim) word. Defaults to 0.45 — Apple-style legible-but-clearly-dim. */
  dimOpacity?: number
  /** When true (default), words light up sequentially across the scroll range.
   *  When false, all words share the same opacity — equivalent to a fade. */
  staggerScroll?: boolean
}

function Word({
  word,
  index,
  total,
  scrollYProgress,
  staggerScroll,
  dimOpacity,
}: {
  word: string
  index: number
  total: number
  scrollYProgress: MotionValue<number>
  staggerScroll: boolean
  dimOpacity: number
}) {
  const start = staggerScroll ? index / total : 0
  const end = staggerScroll ? (index + 1) / total : 1

  const opacity = useTransform(scrollYProgress, [start, end], [dimOpacity, 1])
  const color = useTransform(
    scrollYProgress,
    [start, end],
    ['var(--color-fg3)', 'var(--color-fg1)'],
  )

  return (
    <motion.span style={{ opacity, color }}>
      {word}
      {' '}
    </motion.span>
  )
}

// Outer gate: render a plain element on the server and during the first client
// render, then swap to the active scroll-driven implementation only after
// hydration. Mirrors ScrollRevealLine — avoids the SSR/CSR tree mismatch when
// useReducedMotion resolves differently on the two sides, and prevents
// motion's "Target ref is defined but not hydrated" when the ref-bearing div
// is conditionally absent.
export function ScrollReveal(props: ScrollRevealProps): ReactNode {
  const reduced = useReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || reduced) {
    const Tag = (props.as ?? 'p') as ElementType
    return <Tag className={props.className}>{props.children}</Tag>
  }

  return <ScrollRevealActive {...props} />
}

function ScrollRevealActive({
  children,
  as: Tag = 'p',
  className,
  offset = ['start 0.85', 'start 0.25'],
  dimOpacity = 0.45,
  staggerScroll = true,
}: ScrollRevealProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: offset as ['start 0.85', 'start 0.25'],
  })

  const words = useMemo(
    () => children.split(/\s+/).filter((w) => w.length > 0),
    [children],
  )

  const Element = Tag as ElementType

  return (
    <div ref={ref}>
      <Element className={className}>
        {words.map((word, i) => (
          <Word
            key={`${word}-${i}`}
            word={word}
            index={i}
            total={words.length}
            scrollYProgress={scrollYProgress}
            staggerScroll={staggerScroll}
            dimOpacity={dimOpacity}
          />
        ))}
      </Element>
    </div>
  )
}
