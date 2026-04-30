'use client'

import { useRef } from 'react'
import type { ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useIsTouchDevice, useReducedMotion } from '@/lib/motion/hooks'

type Props = {
  children: ReactNode
  /** Max tilt in degrees on each axis. */
  max?: number
  className?: string
}

export function Tilt3D({ children, max = 5, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const isTouch = useIsTouchDevice()
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springX = useSpring(x, { stiffness: 200, damping: 26 })
  const springY = useSpring(y, { stiffness: 200, damping: 26 })

  const rotateX = useTransform(springY, [-0.5, 0.5], [max, -max])
  const rotateY = useTransform(springX, [-0.5, 0.5], [-max, max])

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || isTouch) return
    const node = ref.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    x.set(px)
    y.set(py)
  }

  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  if (reduceMotion || isTouch) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        transformPerspective: 1000,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
