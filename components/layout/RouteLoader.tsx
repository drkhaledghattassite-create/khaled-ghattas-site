'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'

export function RouteLoader() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const prevRef = useRef(pathname)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (prevRef.current === pathname) return
    prevRef.current = pathname
    setLoading(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setLoading(false), 700)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pathname])

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          dir="ltr"
          aria-hidden
          className="fixed inset-x-0 top-0 z-[99999] h-[2px] origin-left bg-[var(--color-accent)]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 0.8 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      )}
    </AnimatePresence>
  )
}
