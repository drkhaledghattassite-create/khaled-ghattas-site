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
    <div className="rounded-md border border-border bg-bg-elevated p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
          {label}
        </span>
        <Icon className="h-4 w-4 text-fg3" aria-hidden />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span className="text-fg1 font-display font-semibold text-[32px] tracking-[-0.02em]">
          {value}
        </span>
        {delta !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[11px] uppercase tracking-[0.08em] font-display font-semibold',
              positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-accent',
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
