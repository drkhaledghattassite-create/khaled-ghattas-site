'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useThemeColors } from '@/lib/hooks/useThemeColors'

type Point = { day: string; value: number }

function days(n: number, base = 100, jitter = 40): Point[] {
  const out: Point[] = []
  let v = base
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    v = Math.max(0, v + (Math.sin(i * 0.6) * jitter + (Math.random() - 0.5) * jitter) * 0.4)
    out.push({ day: d.toISOString().slice(5, 10), value: Math.round(v) })
  }
  return out
}

const REVENUE = days(30, 380, 120)
const VIEWS = days(30, 1100, 600)
const SUBS = days(30, 24, 8)

function tooltipStyle(c: { surface: string; border: string; text: string }) {
  return {
    background: c.surface,
    border: `1px solid ${c.border}`,
    color: c.text,
    fontSize: 12,
    borderRadius: 4,
  }
}

export function RevenueChart() {
  const c = useThemeColors()
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={REVENUE}>
        <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: c.textMuted }} stroke={c.grid} />
        <YAxis tick={{ fontSize: 10, fill: c.textMuted }} stroke={c.grid} />
        <Tooltip contentStyle={tooltipStyle(c)} />
        <Line type="monotone" dataKey="value" stroke={c.accent} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ViewsChart() {
  const c = useThemeColors()
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={VIEWS}>
        <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: c.textMuted }} stroke={c.grid} />
        <YAxis tick={{ fontSize: 10, fill: c.textMuted }} stroke={c.grid} />
        <Tooltip contentStyle={tooltipStyle(c)} />
        <Bar dataKey="value" fill={c.text} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function SubscribersChart() {
  const c = useThemeColors()
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={SUBS}>
        <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: c.textMuted }} stroke={c.grid} />
        <YAxis tick={{ fontSize: 10, fill: c.textMuted }} stroke={c.grid} />
        <Tooltip contentStyle={tooltipStyle(c)} />
        <defs>
          <linearGradient id="subsArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.accent} stopOpacity={0.4} />
            <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={c.accent} fill="url(#subsArea)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
