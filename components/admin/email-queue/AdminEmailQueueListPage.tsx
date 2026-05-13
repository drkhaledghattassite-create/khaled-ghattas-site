'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/lib/i18n/navigation'
import type { EmailStatus } from '@/lib/db/schema'

export type AdminEmailQueueRow = {
  id: string
  emailType: string
  recipientEmail: string
  subject: string
  status: EmailStatus
  attemptCount: number
  maxAttempts: number
  nextAttemptAt: string
  lastAttemptAt: string | null
  lastError: string | null
  createdAt: string
}

export type AdminEmailQueueListFilter = {
  status: EmailStatus | 'all'
  emailType: string | 'all'
  search: string
}

const STATUSES: Array<EmailStatus | 'all'> = [
  'all',
  'PENDING',
  'SENDING',
  'SENT',
  'FAILED',
  'EXHAUSTED',
]

// Order mirrors the spec — keep TYPES in lock-step with the i18n filter keys
// + the email-send wrapper's emailType discriminator.
const EMAIL_TYPES = [
  'all',
  'post_purchase',
  'booking_confirmation',
  'gift_received',
  'gift_sent',
  'gift_claimed_recipient',
  'gift_claimed_sender',
  'gift_revoked',
  'admin_gift_granted',
  'question_answered',
  'corporate_request',
] as const

function fmtDateTime(iso: string | null, locale: string): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 16)
  }
}

function statusTone(status: EmailStatus): string {
  switch (status) {
    case 'SENT':
      return 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
    case 'SENDING':
      return 'bg-[var(--color-bg-deep)] text-[var(--color-fg2)]'
    case 'PENDING':
      return 'bg-[var(--color-bg-deep)] text-[var(--color-fg2)]'
    case 'FAILED':
      return 'bg-[color:color-mix(in_srgb,var(--color-destructive)_18%,transparent)] text-[var(--color-destructive)]'
    case 'EXHAUSTED':
      return 'bg-[color:color-mix(in_srgb,var(--color-destructive)_18%,transparent)] text-[var(--color-destructive)]'
    default:
      return 'bg-[var(--color-bg-deep)] text-[var(--color-fg3)]'
  }
}

export function AdminEmailQueueListPage({
  rows,
  total,
  page,
  pageSize,
  locale,
  initialFilter,
}: {
  rows: AdminEmailQueueRow[]
  total: number
  page: number
  pageSize: number
  locale: 'ar' | 'en'
  initialFilter: AdminEmailQueueListFilter
}) {
  const t = useTranslations('admin.email_queue')
  const tStatus = useTranslations('admin.email_queue.status')
  const tType = useTranslations('admin.email_queue.filters')
  const localeCtx = useLocale()
  const isRtl = localeCtx === 'ar'
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(initialFilter.search)

  function applyFilter(patch: Partial<AdminEmailQueueListFilter>) {
    const merged = { ...initialFilter, ...patch }
    const params = new URLSearchParams()
    if (merged.status !== 'all') params.set('status', merged.status)
    if (merged.emailType !== 'all') params.set('emailType', merged.emailType)
    if (merged.search.trim()) params.set('search', merged.search.trim())
    startTransition(() => {
      router.push(
        `/admin/email-queue${params.size ? `?${params.toString()}` : ''}`,
      )
    })
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-4">
      <header>
        <h1
          className={`m-0 text-[clamp(20px,2.4vw,26px)] font-bold tracking-[-0.005em] text-fg1 ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.02em]'
          }`}
        >
          {t('heading')}
        </h1>
        <p
          className={`mt-1 max-w-[64ch] text-[13px] leading-[1.55] text-fg3 ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('description')}
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          defaultValue={initialFilter.search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyFilter({ search })
          }}
          placeholder={t('search_placeholder')}
          dir="ltr"
          className="flex-1 min-w-[200px] max-w-[320px] rounded-[var(--radius-md)] border border-border bg-bg-elevated px-3 py-2 text-[13px]"
        />
        <select
          value={initialFilter.emailType}
          onChange={(e) => applyFilter({ emailType: e.target.value })}
          className="rounded-[var(--radius-md)] border border-border bg-bg-elevated px-3 py-2 text-[13px]"
        >
          {EMAIL_TYPES.map((type) => (
            <option key={type} value={type}>
              {tType(type === 'all' ? 'type_all' : (`type_${type}` as 'type_post_purchase'))}
            </option>
          ))}
        </select>
      </div>

      {/* Status pills */}
      <div role="tablist" className="flex flex-wrap gap-1.5">
        {STATUSES.map((status) => {
          const active = initialFilter.status === status
          return (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => applyFilter({ status })}
              className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                active
                  ? 'border-fg1 bg-fg1 text-bg'
                  : 'border-border text-fg2 hover:bg-bg-deep'
              } ${isRtl ? 'font-arabic-body' : 'font-display'}`}
            >
              {tStatus(status === 'all' ? 'pending' : (status.toLowerCase() as 'pending'))}
              {status === 'all' && (
                <span className={isRtl ? 'me-1' : 'ms-1'}>{`(${total})`}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <p
          className={`rounded-md border border-dashed border-border bg-bg p-6 text-center text-[13px] text-fg3 ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-bg-elevated">
          <table
            className="w-full border-collapse text-[13px]"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <thead className="bg-bg-deep text-[11px] uppercase tracking-[0.08em] text-fg3">
              <tr>
                <th className="text-start px-4 py-2">
                  {t('col.created')}
                </th>
                <th className="text-start px-4 py-2">
                  {t('col.recipient')}
                </th>
                <th className="text-start px-4 py-2">
                  {t('col.type')}
                </th>
                <th className="text-start px-4 py-2">
                  {t('col.status')}
                </th>
                <th className="text-start px-4 py-2">
                  {t('col.attempts')}
                </th>
                <th className="text-start px-4 py-2">
                  {t('col.next_attempt')}
                </th>
                <th className="text-start px-4 py-2">
                  {t('col.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const typeKey = (EMAIL_TYPES as readonly string[]).includes(
                  row.emailType,
                )
                  ? row.emailType
                  : 'unknown'
                return (
                  <tr
                    key={row.id}
                    className="border-t border-border hover:bg-bg-deep/50"
                  >
                    <td className="px-4 py-2 text-fg2 [font-feature-settings:'tnum']">
                      {fmtDateTime(row.createdAt, locale)}
                    </td>
                    <td className="px-4 py-2 text-fg1 break-all" dir="ltr">
                      {row.recipientEmail}
                    </td>
                    <td className="px-4 py-2 text-fg2">
                      {tType(`type_${typeKey}` as 'type_post_purchase')}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-semibold ${statusTone(row.status)}`}
                      >
                        {tStatus(row.status.toLowerCase() as 'pending')}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-fg2 [font-feature-settings:'tnum']">
                      {row.attemptCount} / {row.maxAttempts}
                    </td>
                    <td className="px-4 py-2 text-fg2 [font-feature-settings:'tnum']">
                      {fmtDateTime(row.nextAttemptAt, locale)}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/email-queue/${row.id}`}
                        className="text-accent hover:underline"
                      >
                        {t('actions.view')}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span
            className={`text-[12px] text-fg3 [font-feature-settings:'tnum'] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {`${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} / ${total}`}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={(() => {
                  const params = new URLSearchParams()
                  if (initialFilter.status !== 'all')
                    params.set('status', initialFilter.status)
                  if (initialFilter.emailType !== 'all')
                    params.set('emailType', initialFilter.emailType)
                  if (initialFilter.search.trim())
                    params.set('search', initialFilter.search.trim())
                  if (page - 1 > 1) params.set('page', String(page - 1))
                  return `/admin/email-queue${
                    params.size ? `?${params.toString()}` : ''
                  }`
                })()}
                className="rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-[12px] text-fg2 hover:bg-bg-deep"
              >
                ‹
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={(() => {
                  const params = new URLSearchParams()
                  if (initialFilter.status !== 'all')
                    params.set('status', initialFilter.status)
                  if (initialFilter.emailType !== 'all')
                    params.set('emailType', initialFilter.emailType)
                  if (initialFilter.search.trim())
                    params.set('search', initialFilter.search.trim())
                  params.set('page', String(page + 1))
                  return `/admin/email-queue?${params.toString()}`
                })()}
                className="rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-[12px] text-fg2 hover:bg-bg-deep"
              >
                ›
              </Link>
            )}
          </div>
        </div>
      )}

      {isPending && (
        <p
          className={`text-[12px] text-fg3 ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          …
        </p>
      )}
    </div>
  )
}
