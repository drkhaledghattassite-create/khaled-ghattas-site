'use client'

import { useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useReducedMotion } from '@/lib/motion/hooks'

type ScrollRevealLineProps = {
  children: string
  as?: ElementType
  className?: string
  offset?: [string, string]
  dimOpacity?: number
}

function LineWord({
  word,
  lineIndex,
  totalLines,
  scrollYProgress,
  dimOpacity,
  registerRef,
  index,
}: {
  word: string
  lineIndex: number
  totalLines: number
  scrollYProgress: MotionValue<number>
  dimOpacity: number
  registerRef: (el: HTMLSpanElement | null, i: number) => void
  index: number
}) {
  const start = totalLines > 0 ? lineIndex / totalLines : 0
  const end = totalLines > 0 ? (lineIndex + 1) / totalLines : 1

  const opacity = useTransform(scrollYProgress, [start, end], [dimOpacity, 1])
  const color = useTransform(
    scrollYProgress,
    [start, end],
    ['var(--color-fg3)', 'var(--color-fg1)'],
  )

  return (
    <motion.span
      ref={(el) => registerRef(el, index)}
      style={{ opacity, color }}
    >
      {word}
      {' '}
    </motion.span>
  )
}

// Outer gate: render a plain element on the server and during the first client
// render, then swap to the active scroll-driven implementation only after
// hydration. This avoids two failure modes:
//   1. SSR/CSR tree mismatch when `useReducedMotion()` resolves to a different
//      value on the client (the conditional ref-bearing <div> would be present
//      on one side and absent on the other).
//   2. motion's useScroll seeing `ref.current` set against a DOM element that
//      isn't yet committed — which surfaces as "Target ref is defined but not
//      hydrated" during dev Fast Refresh + ViewTransitionsRouter navigations.
export function ScrollRevealLine(props: ScrollRevealLineProps): ReactNode {
  const reduced = useReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || reduced) {
    const Tag = (props.as ?? 'p') as ElementType
    return <Tag className={props.className}>{props.children}</Tag>
  }

  return <ScrollRevealLineActive {...props} />
}

function ScrollRevealLineActive({
  children,
  as: Tag = 'p',
  className,
  offset = ['start 0.9', 'start 0.2'],
  dimOpacity = 0.45,
}: ScrollRevealLineProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])

  const words = useMemo(
    () => children.split(/\s+/).filter((w) => w.length > 0),
    [children],
  )

  /** Per-word -> line index map. Defaults to one-line-per-word until measured. */
  const [lineMap, setLineMap] = useState<{ map: number[]; total: number }>(() => ({
    map: words.map((_, i) => i),
    total: Math.max(1, words.length),
  }))

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: offset as ['start 0.9', 'start 0.2'],
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const recompute = () => {
      const map: number[] = []
      let currentTop: number | null = null
      let currentLine = -1

      wordRefs.current.forEach((el, i) => {
        if (!el) {
          map[i] = currentLine < 0 ? 0 : currentLine
          return
        }
        const rect = el.getBoundingClientRect()
        const top = Math.round(rect.top)
        if (currentTop === null || Math.abs(top - currentTop) > 4) {
          currentLine += 1
          currentTop = top
        }
        map[i] = currentLine
      })

      const total = Math.max(1, currentLine + 1)
      setLineMap({ map, total })
    }

    recompute()

    const ro = new ResizeObserver(recompute)
    if (ref.current) ro.observe(ref.current)
    window.addEventListener('resize', recompute)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [children])

  const Element = Tag as ElementType
  const registerRef = (el: HTMLSpanElement | null, i: number) => {
    wordRefs.current[i] = el
  }

  return (
    <div ref={ref}>
      <Element className={className}>
        {words.map((word, i) => (
          <LineWord
            key={`${word}-${i}`}
            word={word}
            index={i}
            lineIndex={lineMap.map[i] ?? 0}
            totalLines={lineMap.total}
            scrollYProgress={scrollYProgress}
            dimOpacity={dimOpacity}
            registerRef={registerRef}
          />
        ))}
      </Element>
    </div>
  )
}
