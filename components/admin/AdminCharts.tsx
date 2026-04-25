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

type Point = { day: string; value: number }

const grid = '#25232120'
const ink = '#252321'
const amber = '#BC884A'

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

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={REVENUE}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8B8378' }} stroke={grid} />
        <YAxis tick={{ fontSize: 10, fill: '#8B8378' }} stroke={grid} />
        <Tooltip contentStyle={{ background: '#F6F4F1', border: `1px dashed ${ink}`, fontSize: 12 }} />
        <Line type="monotone" dataKey="value" stroke={amber} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ViewsChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={VIEWS}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8B8378' }} stroke={grid} />
        <YAxis tick={{ fontSize: 10, fill: '#8B8378' }} stroke={grid} />
        <Tooltip contentStyle={{ background: '#F6F4F1', border: `1px dashed ${ink}`, fontSize: 12 }} />
        <Bar dataKey="value" fill={ink} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function SubscribersChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={SUBS}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8B8378' }} stroke={grid} />
        <YAxis tick={{ fontSize: 10, fill: '#8B8378' }} stroke={grid} />
        <Tooltip contentStyle={{ background: '#F6F4F1', border: `1px dashed ${ink}`, fontSize: 12 }} />
        <defs>
          <linearGradient id="subsArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={amber} stopOpacity={0.4} />
            <stop offset="100%" stopColor={amber} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={amber} fill="url(#subsArea)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
