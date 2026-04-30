'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'

export function RouteLoader() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const prevRef = useRef(pathname)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (prevRef.current === pathname) return
    prevRef.current = pathname

    if (timerRef.current) clearTimeout(timerRef.current)
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current)

    setLoading(true)
    timerRef.current = setTimeout(() => {
      exitTimerRef.current = setTimeout(() => setLoading(false), 200)
    }, 500)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    }
  }, [pathname])

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          dir="ltr"
          aria-hidden
          className="fixed inset-x-0 top-0 z-[99999] h-[2px] origin-left"
          style={{
            background:
              'linear-gradient(90deg, var(--color-accent) 0%, var(--color-accent-deep) 50%, var(--color-accent) 100%)',
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 0.85 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{
            scaleX: { duration: 0.6, ease: [0.65, 0, 0.35, 1] },
            opacity: { duration: 0.3, ease: 'easeOut' },
          }}
        />
      )}
    </AnimatePresence>
  )
}
