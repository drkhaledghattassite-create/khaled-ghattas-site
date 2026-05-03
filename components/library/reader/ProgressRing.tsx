'use client'

/**
 * Circular progress ring used in the desktop side rail.
 *
 * Shows a percentage in the centre and a remaining-time estimate underneath
 * (estimated at 2 minutes per page, per the brief). Pure SVG — no motion
 * library needed. The transition on the stroke-dashoffset gives a smooth
 * fill animation when currentPage changes.
 */
export function ProgressRing({
  currentPage,
  totalPages,
  size = 96,
  stroke = 6,
  label,
  remainingLabel,
}: {
  currentPage: number
  totalPages: number
  size?: number
  stroke?: number
  label: string
  remainingLabel: string | null
}) {
  const progress =
    totalPages > 0 ? Math.min(1, Math.max(0, currentPage / totalPages)) : 0
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--reader-border)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--reader-accent)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition:
                'stroke-dashoffset 480ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-[18px] font-bold tabular-nums text-[var(--reader-fg)]"
            dir="ltr"
          >
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>
      <p className="m-0 text-[11px] uppercase tracking-[0.14em] text-[var(--reader-fg-faint)]">
        {label}
      </p>
      {remainingLabel && (
        <p className="m-0 text-center text-[12px] text-[var(--reader-fg-muted)]">
          {remainingLabel}
        </p>
      )}
    </div>
  )
}
