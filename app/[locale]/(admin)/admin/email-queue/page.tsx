import { setRequestLocale } from 'next-intl/server'
import { AdminEmailQueueListPage } from '@/components/admin/email-queue/AdminEmailQueueListPage'
import { getAdminEmailQueue } from '@/lib/db/queries'
import type { EmailStatus } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    status?: string
    emailType?: string
    search?: string
    page?: string
  }>
}

const STATUS_VALUES: EmailStatus[] = [
  'PENDING',
  'SENDING',
  'SENT',
  'FAILED',
  'EXHAUSTED',
]

function readStatus(raw: string | undefined): EmailStatus | 'all' {
  if (raw && (STATUS_VALUES as string[]).includes(raw)) return raw as EmailStatus
  return 'all'
}

export default async function AdminEmailQueueRoute({
  params,
  searchParams,
}: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams

  const filter = {
    status: readStatus(sp.status),
    emailType: (sp.emailType ?? 'all').slice(0, 80) || 'all',
    search: (sp.search ?? '').trim() || undefined,
    page: Number.parseInt(sp.page ?? '1', 10) || 1,
    pageSize: 50,
  }
  const data = await getAdminEmailQueue(filter)

  return (
    <AdminEmailQueueListPage
      rows={data.rows.map((row) => ({
        id: row.id,
        emailType: row.emailType,
        recipientEmail: row.recipientEmail,
        subject: row.subject,
        status: row.status,
        attemptCount: row.attemptCount,
        maxAttempts: row.maxAttempts,
        nextAttemptAt: row.nextAttemptAt.toISOString(),
        lastAttemptAt: row.lastAttemptAt ? row.lastAttemptAt.toISOString() : null,
        lastError: row.lastError,
        createdAt: row.createdAt.toISOString(),
      }))}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
      locale={locale === 'ar' ? 'ar' : 'en'}
      initialFilter={{
        status: filter.status,
        emailType: filter.emailType,
        search: sp.search ?? '',
      }}
    />
  )
}
