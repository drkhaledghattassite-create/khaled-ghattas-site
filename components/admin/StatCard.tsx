import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string | number
  delta?: number
  icon: LucideIcon
}

export function StatCard({ label, value, delta, icon: Icon }: Props) {
  const positive = (delta ?? 0) >= 0
  return (
    <div className="rounded-md border border-dashed border-ink/30 bg-cream-soft p-5">
      <div className="flex items-center justify-between">
        <span className="font-label text-[11px] text-ink-muted">{label}</span>
        <Icon className="h-4 w-4 text-ink-muted" aria-hidden />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span
          className="text-ink font-display font-semibold text-[32px] tracking-[-0.02em]"
        >
          {value}
        </span>
        {delta !== undefined && (
          <span
            className={cn(
              'font-label inline-flex items-center gap-0.5 text-[11px]',
              positive ? 'text-success' : 'text-amber',
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            ) : (
              <ArrowDownRight className="h-3 w-3" aria-hidden />
            )}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  )
}
