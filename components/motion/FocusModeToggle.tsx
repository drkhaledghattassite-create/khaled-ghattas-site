'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { motion } from 'motion/react'

const STORAGE_KEY = 'kg_focus_mode'
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

/**
 * Toggle button that enters/exits "focus mode" for long-form reading.
 * When active, adds `focus-mode` class to <html> which CSS uses to:
 *  - hide site header, footer, bottom nav, custom cursor
 *  - widen line-height and shrink margin around the article column
 *  - dim everything except the reading content
 */
export function FocusModeToggle() {
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === '1') setActive(true)
    } catch {}
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('focus-mode', active)
    try {
      localStorage.setItem(STORAGE_KEY, active ? '1' : '0')
    } catch {}
  }, [active])

  // Allow Esc to exit
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  const label = active
    ? isRtl
      ? 'الخروج من وضع القراءة'
      : 'Exit reading mode'
    : isRtl
      ? 'وضع القراءة'
      : 'Reading mode'

  return (
    <motion.button
      type="button"
      onClick={() => setActive((v) => !v)}
      aria-pressed={active}
      aria-label={label}
      title={label}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay: 0.6 }}
      className={`group fixed z-[70] [inset-block-end:clamp(72px,8vw,96px)] ${
        isRtl ? '[inset-inline-start:clamp(16px,3vw,28px)]' : '[inset-inline-end:clamp(16px,3vw,28px)]'
      } inline-flex h-11 items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)]/95 px-4 text-[12px] font-semibold tracking-[0.04em] text-[var(--color-fg2)] backdrop-blur-md transition-[background,color,border-color] duration-200 hover:border-[var(--color-fg1)] hover:text-[var(--color-fg1)] hover:bg-[var(--color-bg-elevated)] [box-shadow:0_4px_16px_-4px_rgba(0,0,0,0.12)] data-[active=true]:bg-[var(--color-fg1)] data-[active=true]:text-[var(--color-bg)] data-[active=true]:border-[var(--color-fg1)] ${
        isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !font-bold' : 'font-display'
      }`}
      data-active={active}
      data-cursor="hover"
      data-hide-in-focus="false"
    >
      <FocusIcon active={active} />
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  )
}

function FocusIcon({ active }: { active: boolean }) {
  return (
    <span aria-hidden className="relative inline-flex h-4 w-4 items-center justify-center">
      <motion.span
        className="absolute inset-0 rounded-[2px] border border-current"
        animate={{ rotate: active ? 45 : 0, scale: active ? 0.85 : 1 }}
        transition={{ duration: 0.3, ease: EASE }}
      />
      <motion.span
        className="absolute h-[2px] w-[10px] bg-current"
        animate={{ opacity: active ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      />
    </span>
  )
}
