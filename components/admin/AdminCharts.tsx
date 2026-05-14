'use client'

import { useMemo } from 'react'
import { useLocale } from 'next-intl'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import type {
  DailyCountPoint,
  DailyRevenuePoint,
} from '@/lib/db/queries'

// All charts receive their data as props from the admin home server component.
// No client-side fabrication; previous random-sine-wave fallbacks were a UX
// trap (operators saw simulated revenue and could not tell). When the DB is
// empty or DATABASE_URL is unset, the query helpers return zero-filled
// windows; the charts render a flat line at y=0 rather than a fake hill.

function tooltipStyle(c: { surface: string; border: string; text: string }) {
  return {
    background: c.surface,
    border: `1px solid ${c.border}`,
    color: c.text,
    fontSize: 12,
    borderRadius: 4,
  }
}

function shortDay(iso: string): string {
  // YYYY-MM-DD → MM-DD. Bilingual-safe (numeric only, no month names).
  return iso.slice(5)
}

export function RevenueChart({ data }: { data: DailyRevenuePoint[] }) {
  const c = useThemeColors()
  const locale = useLocale()
  const currencyFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    [locale],
  )
  const points = useMemo(
    () => data.map((d) => ({ day: shortDay(d.date), value: d.revenue })),
    [data],
  )
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points}>
        <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: c.textMuted }}
          stroke={c.grid}
        />
        <YAxis
          tick={{ fontSize: 10, fill: c.textMuted }}
          stroke={c.grid}
          tickFormatter={(v) => currencyFmt.format(Number(v))}
          width={60}
        />
        <Tooltip
          contentStyle={tooltipStyle(c)}
          formatter={(v) => currencyFmt.format(Number(v ?? 0))}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={c.accent}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function SubscribersChart({ data }: { data: DailyCountPoint[] }) {
  const c = useThemeColors()
  const locale = useLocale()
  const countFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
        maximumFractionDigits: 0,
      }),
    [locale],
  )
  const points = useMemo(
    () => data.map((d) => ({ day: shortDay(d.date), value: d.count })),
    [data],
  )
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={points}>
        <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: c.textMuted }}
          stroke={c.grid}
        />
        <YAxis
          tick={{ fontSize: 10, fill: c.textMuted }}
          stroke={c.grid}
          allowDecimals={false}
          tickFormatter={(v) => countFmt.format(Number(v))}
          width={40}
        />
        <Tooltip
          contentStyle={tooltipStyle(c)}
          formatter={(v) => countFmt.format(Number(v ?? 0))}
        />
        <defs>
          <linearGradient id="subsArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.accent} stopOpacity={0.4} />
            <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={c.accent}
          fill="url(#subsArea)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
