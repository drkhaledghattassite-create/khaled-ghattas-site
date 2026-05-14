'use client'

import { useMemo } from 'react'
import { useLocale } from 'next-intl'
import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import { useReducedMotion } from '@/lib/motion/hooks'

// Single sienna line + dashed prior-period line + faint area fill.
// Axes are pared back to corner ticks only (first/middle/last on X,
// 0/rounded-max on Y) per the design. No gridlines beyond a single
// dashed midline. Entrance animation respects reduced-motion.

type Point = { date: string; revenue: number }

export function RevenueChart({
  current,
  prior,
}: {
  current: Point[]
  prior: Point[]
}) {
  const c = useThemeColors()
  const locale = useLocale()
  const reduced = useReducedMotion()
  const animationDuration = reduced ? 0 : 600

  const data = useMemo(() => {
    const len = Math.max(current.length, prior.length)
    return Array.from({ length: len }, (_, i) => ({
      date: current[i]?.date ?? prior[i]?.date ?? '',
      current: current[i]?.revenue ?? 0,
      prior: prior[i]?.revenue ?? 0,
    }))
  }, [current, prior])

  const allValues = data.flatMap((d) => [d.current, d.prior])
  const rawMax = Math.max(1, ...allValues)
  const yMax = Math.ceil(rawMax * 1.08)
  const yTicks = [0, yMax]

  const currencyFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    [locale],
  )
  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
    [locale],
  )

  const xTicks: string[] = useMemo(() => {
    if (data.length === 0) return []
    const first = data[0]?.date
    const last = data[data.length - 1]?.date
    const mid = data[Math.floor(data.length / 2)]?.date
    return [first, mid, last].filter((d): d is string => typeof d === 'string')
  }, [data])

  const formatXTick = (iso: string) => {
    if (!iso) return ''
    const d = new Date(`${iso}T00:00:00Z`)
    if (Number.isNaN(d.getTime())) return iso
    return dateFmt.format(d)
  }

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 8, bottom: 22, left: 32 }}
        >
          <defs>
            <linearGradient id="revAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.accent} stopOpacity={0.12} />
              <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            ticks={xTicks}
            tickFormatter={formatXTick}
            tick={{ fontSize: 10.5, fill: c.textMuted }}
            tickLine={false}
            axisLine={false}
            interval={0}
            padding={{ left: 4, right: 4 }}
          />
          <YAxis
            ticks={yTicks}
            domain={[0, yMax]}
            tickFormatter={(v: number) => currencyFmt.format(Number(v))}
            tick={{ fontSize: 10.5, fill: c.textMuted }}
            tickLine={false}
            axisLine={false}
            width={36}
            allowDataOverflow={false}
          />
          <Area
            type="monotone"
            dataKey="current"
            stroke="none"
            fill="url(#revAreaFill)"
            isAnimationActive={!reduced}
            animationDuration={animationDuration}
          />
          <Line
            type="monotone"
            dataKey="prior"
            stroke={c.accent}
            strokeWidth={1}
            strokeDasharray="3 3"
            strokeOpacity={0.4}
            dot={false}
            isAnimationActive={!reduced}
            animationDuration={animationDuration}
          />
          <Line
            type="monotone"
            dataKey="current"
            stroke={c.accent}
            strokeWidth={1.75}
            strokeLinecap="round"
            dot={false}
            isAnimationActive={!reduced}
            animationDuration={animationDuration}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
