'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <span className="inline-block h-9 w-9" />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-raised)]/80 backdrop-blur-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-deep)]"
    >
      <span className="inline-flex items-center justify-center transition-transform duration-300" style={{ transform: isDark ? 'rotate(0deg)' : 'rotate(-30deg)' }}>
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </span>
    </button>
  )
}
