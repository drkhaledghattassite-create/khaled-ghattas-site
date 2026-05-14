import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { AdminEmailQueueDetailPage } from '@/components/admin/email-queue/AdminEmailQueueDetailPage'
import { requireDeveloperPage } from '@/lib/auth/server'
import { getEmailQueueEntry } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function AdminEmailQueueDetailRoute({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  // Developer-only — CLIENT viewers see the 404 page.
  await requireDeveloperPage()

  const entry = await getEmailQueueEntry(id)
  if (!entry) notFound()

  return (
    <AdminEmailQueueDetailPage
      locale={locale === 'ar' ? 'ar' : 'en'}
      entry={{
        id: entry.id,
        emailType: entry.emailType,
        recipientEmail: entry.recipientEmail,
        subject: entry.subject,
        htmlBody: entry.htmlBody,
        textBody: entry.textBody,
        fromAddress: entry.fromAddress,
        replyTo: entry.replyTo,
        status: entry.status,
        attemptCount: entry.attemptCount,
        maxAttempts: entry.maxAttempts,
        nextAttemptAt: entry.nextAttemptAt.toISOString(),
        lastAttemptAt: entry.lastAttemptAt
          ? entry.lastAttemptAt.toISOString()
          : null,
        lastError: entry.lastError,
        resendMessageId: entry.resendMessageId,
        relatedEntityType: entry.relatedEntityType,
        relatedEntityId: entry.relatedEntityId,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      }}
    />
  )
}
