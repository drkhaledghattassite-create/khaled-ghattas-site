'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import { Link, useRouter } from '@/lib/i18n/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  markEmailQueueFailedAction,
  retryEmailQueueAction,
} from '@/app/[locale]/(admin)/admin/email-queue/actions'
import type { EmailStatus } from '@/lib/db/schema'

export type AdminEmailQueueDetail = {
  id: string
  emailType: string
  recipientEmail: string
  subject: string
  htmlBody: string
  textBody: string
  fromAddress: string
  replyTo: string | null
  status: EmailStatus
  attemptCount: number
  maxAttempts: number
  nextAttemptAt: string
  lastAttemptAt: string | null
  lastError: string | null
  resendMessageId: string | null
  relatedEntityType: string | null
  relatedEntityId: string | null
  createdAt: string
  updatedAt: string
}

function fmtDateTime(iso: string | null, locale: string): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 16)
  }
}

function relatedEntityHref(type: string | null, id: string | null): string | null {
  if (!type || !id) return null
  switch (type) {
    case 'gift':
      return `/admin/gifts/${id}`
    case 'order':
      return `/admin/orders/${id}`
    case 'booking_order':
      return `/admin/booking/orders/${id}`
    case 'booking':
      return `/admin/booking/bookings/${id}/edit`
    case 'question':
      return `/admin/questions`
    case 'corporate_request':
      return `/admin/corporate/requests/${id}`
    default:
      return null
  }
}

export function AdminEmailQueueDetailPage({
  locale,
  entry,
}: {
  locale: 'ar' | 'en'
  entry: AdminEmailQueueDetail
}) {
  const t = useTranslations('admin.email_queue')
  const tDetail = useTranslations('admin.email_queue.detail')
  const tStatus = useTranslations('admin.email_queue.status')
  const tType = useTranslations('admin.email_queue.filters')
  const tModal = useTranslations('admin.email_queue.modal')
  const tToast = useTranslations('admin.email_queue.toast')
  const localeCtx = useLocale()
  const isRtl = localeCtx === 'ar'
  const router = useRouter()
  const [retryOpen, setRetryOpen] = useState(false)
  const [failOpen, setFailOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  const canRetry =
    entry.status === 'EXHAUSTED' ||
    entry.status === 'FAILED' ||
    entry.status === 'PENDING'
  const canMarkFailed =
    entry.status === 'PENDING' || entry.status === 'SENDING'

  const relatedHref = relatedEntityHref(
    entry.relatedEntityType,
    entry.relatedEntityId,
  )

  function handleRetry() {
    startTransition(async () => {
      const result = await retryEmailQueueAction({ id: entry.id })
      if (result.ok) {
        toast.success(tToast('retry_success'))
        setRetryOpen(false)
        router.refresh()
      } else {
        toast.error(tToast('error_generic'))
      }
    })
  }

  function handleMarkFailed() {
    if (reason.trim().length < 3) {
      toast.error(tToast('error_generic'))
      return
    }
    startTransition(async () => {
      const result = await markEmailQueueFailedAction({
        id: entry.id,
        reason: reason.trim(),
      })
      if (result.ok) {
        toast.success(tToast('mark_failed_success'))
        setFailOpen(false)
        router.refresh()
      } else {
        toast.error(tToast('error_generic'))
      }
    })
  }

  // HTML preview goes into a sandboxed iframe via srcDoc so the rendered
  // email can't make outbound requests, run scripts, or scrape the host
  // page. Sandbox attribute disables everything by default.
  const typeKey = entry.emailType
  const typeLabel = (() => {
    try {
      return tType(`type_${typeKey}` as 'type_post_purchase')
    } catch {
      return entry.emailType
    }
  })()

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5">
      <Link
        href="/admin/email-queue"
        className="inline-flex items-center gap-1 text-[12px] text-fg3 hover:text-fg1"
      >
        <ChevronLeft className="h-3 w-3 rtl:rotate-180" aria-hidden />
        {tDetail('back')}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className={`m-0 text-[clamp(20px,2.4vw,26px)] font-bold tracking-[-0.005em] text-fg1 ${
              isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.02em]'
            }`}
          >
            {tDetail('heading')}
          </h1>
          <p
            className={`mt-1 text-[13px] text-fg3 [font-feature-settings:'tnum'] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {entry.id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRetry && (
            <AlertDialog open={retryOpen} onOpenChange={setRetryOpen}>
              <AlertDialogTrigger
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent/60 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-accent transition-colors hover:bg-accent hover:text-accent-fg disabled:opacity-50"
              >
                {t('actions.retry')}
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>{tModal('retry_title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {tModal('retry_body')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>
                    {tModal('cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleRetry} disabled={isPending}>
                    {tModal('retry_confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canMarkFailed && (
            <AlertDialog open={failOpen} onOpenChange={setFailOpen}>
              <AlertDialogTrigger
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-fg2 transition-colors hover:bg-bg-deep disabled:opacity-50"
              >
                {t('actions.mark_failed')}
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>{tModal('mark_failed_title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {tModal('mark_failed_body')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="mt-3 grid gap-1.5">
                  <label
                    htmlFor="failed-reason"
                    className="text-[12px] font-semibold uppercase tracking-[0.08em] text-fg3"
                  >
                    {tModal('mark_failed_reason_label')}
                  </label>
                  <input
                    id="failed-reason"
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={tModal('mark_failed_reason_placeholder')}
                    maxLength={500}
                    className="rounded-[var(--radius-md)] border border-border bg-bg-elevated px-3 py-2 text-[13px]"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>
                    {tModal('cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleMarkFailed}
                    disabled={isPending}
                    variant="destructive"
                  >
                    {tModal('mark_failed_confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </header>

      <section className="rounded-md border border-border bg-bg-elevated p-5">
        <h2
          className={`m-0 mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3 ${
            isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold' : 'font-display'
          }`}
        >
          {tDetail('section_overview')}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
          <DetailRow label={tDetail('label_type')} value={typeLabel} />
          <DetailRow
            label={tDetail('label_status')}
            value={tStatus(entry.status.toLowerCase() as 'pending')}
          />
          <DetailRow label={tDetail('label_recipient')} value={entry.recipientEmail} />
          <DetailRow label={tDetail('label_subject')} value={entry.subject} />
          <DetailRow label={tDetail('label_from')} value={entry.fromAddress} />
          <DetailRow label={tDetail('label_reply_to')} value={entry.replyTo ?? '—'} />
          <DetailRow
            label={tDetail('label_attempts')}
            value={`${entry.attemptCount} / ${entry.maxAttempts}`}
          />
          <DetailRow
            label={tDetail('label_next_attempt')}
            value={fmtDateTime(entry.nextAttemptAt, locale)}
          />
          <DetailRow
            label={tDetail('label_last_attempt')}
            value={fmtDateTime(entry.lastAttemptAt, locale)}
          />
          <DetailRow
            label={tDetail('label_resend_id')}
            value={entry.resendMessageId ?? '—'}
          />
          <DetailRow
            label={tDetail('label_created')}
            value={fmtDateTime(entry.createdAt, locale)}
          />
          <DetailRow
            label={tDetail('label_updated')}
            value={fmtDateTime(entry.updatedAt, locale)}
          />
        </dl>
        {entry.lastError && (
          <div className="mt-5 rounded-md border border-destructive/30 bg-[color:color-mix(in_srgb,var(--color-destructive)_8%,transparent)] p-3">
            <p
              className={`m-0 mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-destructive ${
                isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold' : 'font-display'
              }`}
            >
              {tDetail('label_last_error')}
            </p>
            <pre
              className="m-0 whitespace-pre-wrap break-words font-mono text-[12px] text-fg1"
              dir="ltr"
            >
              {entry.lastError}
            </pre>
          </div>
        )}
      </section>

      {/* Related entity */}
      <section className="rounded-md border border-border bg-bg-elevated p-5">
        <h2
          className={`m-0 mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3 ${
            isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold' : 'font-display'
          }`}
        >
          {tDetail('section_related')}
        </h2>
        {relatedHref ? (
          <Link href={relatedHref} className="text-accent hover:underline text-[14px]">
            {tDetail('related_link')} ({entry.relatedEntityType})
          </Link>
        ) : (
          <p className="m-0 text-[13px] text-fg3">{tDetail('no_related')}</p>
        )}
      </section>

      {/* HTML preview */}
      <section className="rounded-md border border-border bg-bg-elevated p-5">
        <h2
          className={`m-0 mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3 ${
            isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold' : 'font-display'
          }`}
        >
          {tDetail('section_preview')}
        </h2>
        <iframe
          title={tDetail('preview_iframe_label')}
          srcDoc={entry.htmlBody}
          sandbox=""
          className="h-[600px] w-full rounded-[var(--radius-md)] border border-border bg-white"
        />
      </section>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-fg3">
        {label}
      </dt>
      <dd className="m-0 mt-1 break-all text-fg1">{value}</dd>
    </div>
  )
}
