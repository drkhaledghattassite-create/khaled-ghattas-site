import { cn } from '@/lib/utils'

/**
 * Printer's flourish glyphs used as section ornaments — the visual signature
 * of the Mawqid editorial system. Pure SVG so it scales cleanly and accepts
 * currentColor.
 */

type Glyph = 'fleuron' | 'star' | 'asterism' | 'rule' | 'arabesque'

type OrnamentProps = {
  glyph?: Glyph
  size?: number
  className?: string
  strokeWidth?: number
}

export function Ornament({
  glyph = 'fleuron',
  size = 24,
  className,
  strokeWidth = 1.2,
}: OrnamentProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth,
    className: cn('inline-block align-middle', className),
    'aria-hidden': true,
  }

  switch (glyph) {
    case 'fleuron':
      return (
        <svg {...common}>
          <path d="M24 6c2 4 6 7 10 7-4 1-8 4-10 8-2-4-6-7-10-7 4-1 8-4 10-8z" />
          <path d="M24 26c2 4 6 7 10 7-4 1-8 4-10 8-2-4-6-7-10-7 4-1 8-4 10-8z" />
          <path d="M24 16v16" />
        </svg>
      )
    case 'star':
      return (
        <svg {...common}>
          <path d="M24 4l3 14 14 6-14 6-3 14-3-14L7 24l14-6 3-14z" />
        </svg>
      )
    case 'asterism':
      return (
        <svg {...common}>
          <circle cx="14" cy="32" r="2" fill="currentColor" />
          <circle cx="34" cy="32" r="2" fill="currentColor" />
          <circle cx="24" cy="14" r="2" fill="currentColor" />
        </svg>
      )
    case 'arabesque':
      return (
        <svg {...common}>
          <path d="M4 24c6-8 12-8 20 0s14 8 20 0" />
          <path d="M4 24c6 8 12 8 20 0s14-8 20 0" />
          <circle cx="24" cy="24" r="2.4" fill="currentColor" />
        </svg>
      )
    case 'rule':
    default:
      return (
        <svg {...common} viewBox="0 0 120 12">
          <path d="M0 6h44" />
          <path d="M76 6h44" />
          <circle cx="60" cy="6" r="2.4" fill="currentColor" />
          <path d="M52 6h2M66 6h2" />
        </svg>
      )
  }
}

/**
 * Chapter mark — `.01 — Eyebrow` paired with the brass fleuron. Use at the
 * top of every major section to anchor the journal-chapter rhythm.
 */
type ChapterMarkProps = {
  number: string
  label: string
  className?: string
  align?: 'start' | 'center'
}

export function ChapterMark({ number, label, className, align = 'start' }: ChapterMarkProps) {
  return (
    <div
      className={cn(
        'inline-flex items-baseline gap-3 text-ink-muted',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      <Ornament glyph="fleuron" size={14} className="text-brass animate-flourish-pulse" />
      <span
        className="font-display font-medium text-[12px] tracking-[0.18em] uppercase"
        style={{ fontFeatureSettings: '"smcp", "ss01"' }}
      >
        {number}
      </span>
      <span aria-hidden className="block h-px w-8 bg-ink-muted/50" />
      <span
        className="font-display italic font-normal text-[12px] tracking-[0.04em] normal-case text-ink-soft"
      >
        {label}
      </span>
    </div>
  )
}

/**
 * Centered horizontal rule with a fleuron in the middle — for between-section
 * dividers when both sides share the same surface.
 */
export function FlourishRule({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-4 text-ink-muted/45', className)}>
      <span aria-hidden className="block h-px w-24 bg-current" />
      <Ornament glyph="fleuron" size={18} className="text-brass" />
      <span aria-hidden className="block h-px w-24 bg-current" />
    </div>
  )
}
