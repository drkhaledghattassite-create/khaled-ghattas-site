'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronLeft, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from '@/lib/i18n/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StatusBadge } from '../StatusBadge'
import type {
  GiftItemType,
  GiftStatus,
  OrderStatus,
  ProductType,
  QuestionStatus,
  UserRole,
} from '@/lib/db/schema'

/* ── Row types (date strings, not Date — RSC payload safety) ───────────── */

export type UserRow = {
  id: string
  name: string | null
  email: string
  role: UserRole
  emailVerified: boolean
  createdAt: string
}

type OrderRow = {
  id: string
  status: OrderStatus
  totalAmount: string
  currency: string
  createdAt: string
}

type BookingOrderRow = {
  id: string
  status: OrderStatus
  amountPaid: number
  currency: string
  bookingTitleAr: string
  bookingTitleEn: string
  cohortLabelAr: string | null
  cohortLabelEn: string | null
  confirmedAt: string | null
  createdAt: string
}

type SentGiftRow = {
  id: string
  status: GiftStatus
  itemType: GiftItemType
  recipientEmail: string
  amountCents: number | null
  currency: string
  createdAt: string
}

type ReceivedGiftRow = {
  id: string
  status: GiftStatus
  itemType: GiftItemType
  senderUserId: string | null
  amountCents: number | null
  currency: string
  createdAt: string
}

type QuestionRow = {
  id: string
  subject: string
  status: QuestionStatus
  category: string | null
  createdAt: string
}

type TestAttemptRow = {
  id: string
  scorePercentage: number
  correctCount: number
  totalCount: number
  testSlug: string
  testTitleAr: string
  testTitleEn: string
  completedAt: string
}

type LibraryRow = {
  bookId: string
  bookSlug: string
  bookTitleAr: string
  bookTitleEn: string
  productType: ProductType
  purchasedAt: string
}

type Props = {
  locale: 'ar' | 'en'
  viewerRole: UserRole
  user: UserRow
  orders: OrderRow[]
  bookingOrders: BookingOrderRow[]
  sentGifts: SentGiftRow[]
  receivedGifts: ReceivedGiftRow[]
  questions: QuestionRow[]
  testAttempts: TestAttemptRow[]
  library: LibraryRow[]
}

const ROLES: UserRole[] = ['USER', 'ADMIN', 'CLIENT']

/* ── Formatters ───────────────────────────────────────────────────────── */

function fmtDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

function fmtMoney(amount: string | number, currency: string, locale: string): string {
  const num = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(num)) return String(amount)
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-LB' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(num)
  } catch {
    return `${num.toFixed(2)} ${currency}`
  }
}

function fmtCents(cents: number, currency: string, locale: string): string {
  return fmtMoney(cents / 100, currency, locale)
}

export function UserDetailPage({
  locale,
  viewerRole,
  user,
  orders,
  bookingOrders,
  sentGifts,
  receivedGifts,
  questions,
  testAttempts,
  library,
}: Props) {
  const t = useTranslations('admin.user_detail')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const localeCtx = useLocale()
  const canEditRoles = viewerRole === 'ADMIN'

  const [editingRole, setEditingRole] = useState(false)
  const [draftRole, setDraftRole] = useState<UserRole>(user.role)
  const [saving, setSaving] = useState(false)

  async function saveRole() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: draftRole }),
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_saved'))
      setEditingRole(false)
      // Force a fresh read so the header role badge updates.
      window.location.reload()
    } catch (err) {
      console.error('[UserDetailPage/save]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setSaving(false)
    }
  }

  // Approximate last-activity = most-recent timestamp across the user's data.
  // Cheap client-side calc since we already loaded the rows. Falls back to
  // the user's signup date when nothing else exists.
  const lastActivity = [
    user.createdAt,
    ...orders.map((o) => o.createdAt),
    ...bookingOrders.map((o) => o.createdAt),
    ...sentGifts.map((g) => g.createdAt),
    ...receivedGifts.map((g) => g.createdAt),
    ...questions.map((q) => q.createdAt),
    ...testAttempts.map((a) => a.completedAt),
  ].sort((a, b) => (a < b ? 1 : -1))[0]

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="font-label inline-flex items-center gap-1 text-[12px] text-fg3 hover:text-fg1"
      >
        <ChevronLeft className="h-3 w-3 rtl:rotate-180" aria-hidden />
        {t('back_to_list')}
      </Link>

      {/* Header */}
      <section className="rounded-md border border-dashed border-border bg-bg-elevated p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span aria-hidden className="block h-12 w-12 shrink-0 rounded-full bg-fg1/80" />
            <div className="flex flex-col leading-tight">
              <h1 className="m-0 text-fg1 font-display font-semibold text-[20px] tracking-[-0.01em]">
                {user.name ?? '—'}
              </h1>
              <p className="m-0 font-label text-[12px] text-fg3">{user.email}</p>
              <p className="m-0 mt-1 text-[11px] text-fg3 font-display">
                {t('joined_label')} {fmtDate(user.createdAt, localeCtx)}
                {' · '}
                {t('last_activity_label')}{' '}
                {lastActivity ? fmtDate(lastActivity, localeCtx) : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={user.role} />
            {canEditRoles && (
              <button
                type="button"
                onClick={() => {
                  setDraftRole(user.role)
                  setEditingRole(true)
                }}
                aria-label={t('edit_role')}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-[11px] font-display font-semibold uppercase tracking-[0.08em] text-fg2 hover:bg-bg-deep hover:text-fg1"
              >
                <Pencil className="h-3 w-3" aria-hidden />
                {t('edit_role')}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Orders */}
      <Section title={t('section_orders')} count={orders.length} empty={t('empty_orders')}>
        {orders.length > 0 && (
          <Table
            head={[t('col_id'), t('col_date'), t('col_amount'), t('col_status'), tForms('actions')]}
          >
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-border hover:bg-bg-deep/50">
                <Td>
                  <span className="font-mono text-[11px] text-fg3">
                    {o.id.slice(-8).toUpperCase()}
                  </span>
                </Td>
                <Td>{fmtDate(o.createdAt, localeCtx)}</Td>
                <Td>{fmtMoney(o.totalAmount, o.currency, localeCtx)}</Td>
                <Td>
                  <StatusBadge status={o.status} />
                </Td>
                <Td>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="text-accent underline text-[12px]"
                  >
                    {t('view_cta')}
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* Bookings */}
      <Section
        title={t('section_bookings')}
        count={bookingOrders.length}
        empty={t('empty_bookings')}
      >
        {bookingOrders.length > 0 && (
          <Table
            head={[
              t('col_booking'),
              t('col_cohort'),
              t('col_date'),
              t('col_amount'),
              t('col_status'),
              tForms('actions'),
            ]}
          >
            {bookingOrders.map((b) => (
              <tr key={b.id} className="border-t border-border hover:bg-bg-deep/50">
                <Td>{locale === 'ar' ? b.bookingTitleAr : b.bookingTitleEn}</Td>
                <Td>
                  {(locale === 'ar' ? b.cohortLabelAr : b.cohortLabelEn) ?? '—'}
                </Td>
                <Td>{fmtDate(b.confirmedAt ?? b.createdAt, localeCtx)}</Td>
                <Td>{fmtCents(b.amountPaid, b.currency, localeCtx)}</Td>
                <Td>
                  <StatusBadge status={b.status} />
                </Td>
                <Td>
                  <Link
                    href={`/admin/booking/orders/${b.id}`}
                    className="text-accent underline text-[12px]"
                  >
                    {t('view_cta')}
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* Gifts sent */}
      <Section
        title={t('section_gifts_sent')}
        count={sentGifts.length}
        empty={t('empty_gifts_sent')}
      >
        {sentGifts.length > 0 && (
          <Table
            head={[
              t('col_recipient'),
              t('col_item'),
              t('col_amount'),
              t('col_date'),
              t('col_status'),
              tForms('actions'),
            ]}
          >
            {sentGifts.map((g) => (
              <tr key={g.id} className="border-t border-border hover:bg-bg-deep/50">
                <Td className="break-all">{g.recipientEmail}</Td>
                <Td>{itemTypeLabel(g.itemType)}</Td>
                <Td>
                  {g.amountCents != null
                    ? fmtCents(g.amountCents, g.currency, localeCtx)
                    : '—'}
                </Td>
                <Td>{fmtDate(g.createdAt, localeCtx)}</Td>
                <Td>
                  <StatusBadge status={g.status} />
                </Td>
                <Td>
                  <Link
                    href={`/admin/gifts/${g.id}`}
                    className="text-accent underline text-[12px]"
                  >
                    {t('view_cta')}
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* Gifts received */}
      <Section
        title={t('section_gifts_received')}
        count={receivedGifts.length}
        empty={t('empty_gifts_received')}
      >
        {receivedGifts.length > 0 && (
          <Table
            head={[
              t('col_item'),
              t('col_amount'),
              t('col_date'),
              t('col_status'),
              tForms('actions'),
            ]}
          >
            {receivedGifts.map((g) => (
              <tr key={g.id} className="border-t border-border hover:bg-bg-deep/50">
                <Td>{itemTypeLabel(g.itemType)}</Td>
                <Td>
                  {g.amountCents != null
                    ? fmtCents(g.amountCents, g.currency, localeCtx)
                    : '—'}
                </Td>
                <Td>{fmtDate(g.createdAt, localeCtx)}</Td>
                <Td>
                  <StatusBadge status={g.status} />
                </Td>
                <Td>
                  <Link
                    href={`/admin/gifts/${g.id}`}
                    className="text-accent underline text-[12px]"
                  >
                    {t('view_cta')}
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* Questions */}
      <Section
        title={t('section_questions')}
        count={questions.length}
        empty={t('empty_questions')}
      >
        {questions.length > 0 && (
          <Table
            head={[t('col_subject'), t('col_category'), t('col_date'), t('col_status')]}
          >
            {questions.map((q) => (
              <tr key={q.id} className="border-t border-border hover:bg-bg-deep/50">
                <Td className="max-w-[40ch] truncate">{q.subject}</Td>
                <Td>{q.category ?? '—'}</Td>
                <Td>{fmtDate(q.createdAt, localeCtx)}</Td>
                <Td>
                  <StatusBadge status={q.status} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* Test attempts */}
      <Section
        title={t('section_tests')}
        count={testAttempts.length}
        empty={t('empty_tests')}
      >
        {testAttempts.length > 0 && (
          <Table head={[t('col_test'), t('col_score'), t('col_date')]}>
            {testAttempts.map((a) => (
              <tr key={a.id} className="border-t border-border hover:bg-bg-deep/50">
                <Td>{locale === 'ar' ? a.testTitleAr : a.testTitleEn}</Td>
                <Td>
                  <span className="num-latn font-display">
                    {a.scorePercentage}% ({a.correctCount}/{a.totalCount})
                  </span>
                </Td>
                <Td>{fmtDate(a.completedAt, localeCtx)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* Library */}
      <Section
        title={t('section_library')}
        count={library.length}
        empty={t('empty_library')}
      >
        {library.length > 0 && (
          <Table head={[t('col_book'), t('col_type'), t('col_purchased_at')]}>
            {library.map((entry) => (
              <tr
                key={entry.bookId}
                className="border-t border-border hover:bg-bg-deep/50"
              >
                <Td>{locale === 'ar' ? entry.bookTitleAr : entry.bookTitleEn}</Td>
                <Td>{productTypeLabel(entry.productType)}</Td>
                <Td>{fmtDate(entry.purchasedAt, localeCtx)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {canEditRoles && (
        <AlertDialog open={editingRole} onOpenChange={(open) => !open && setEditingRole(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('edit_role')}</AlertDialogTitle>
              <AlertDialogDescription>
                {user.email} — {t('confirm_role')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <fieldset className="space-y-2" disabled={saving}>
              {ROLES.map((r) => (
                <label
                  key={r}
                  className="flex cursor-pointer items-center gap-2 rounded border border-border px-3 py-2 text-[13px] hover:border-fg1"
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={draftRole === r}
                    onChange={() => setDraftRole(r)}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </fieldset>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>
                {tForms('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={saveRole} disabled={saving}>
                {tForms('save')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* itemTypeLabel / productTypeLabel rendered via the closures below
          rely on translations not memoised across the component. Acceptable
          — they're cheap pure lookups. */}
    </div>
  )

  function itemTypeLabel(type: GiftItemType): string {
    if (type === 'BOOK') return t('itemtype_book')
    if (type === 'SESSION') return t('itemtype_session')
    if (type === 'BOOKING') return t('itemtype_booking')
    return t('itemtype_test')
  }

  function productTypeLabel(type: ProductType): string {
    if (type === 'BOOK') return t('itemtype_book')
    return t('itemtype_session')
  }
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string
  count: number
  empty: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-md border border-dashed border-border bg-bg-elevated p-5">
      <h2 className="mb-3 flex items-center gap-2 text-fg1 font-display font-semibold text-[14px] uppercase tracking-[0.04em]">
        {title}
        <span className="rounded-full bg-bg-deep px-2 py-0.5 text-[11px] font-display font-semibold text-fg3 num-latn">
          {count}
        </span>
      </h2>
      {count === 0 ? <p className="m-0 text-[12px] text-fg3">{empty}</p> : children}
    </section>
  )
}

function Table({
  head,
  children,
}: {
  head: string[]
  children: React.ReactNode
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-bg">
      <table className="w-full text-[13px]">
        <thead className="bg-bg-deep">
          <tr>
            {head.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-3 py-2.5 text-start text-[10px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={`px-3 py-2 align-middle text-fg1 ${className}`}>
      {children}
    </td>
  )
}
