import { notFound } from 'next/navigation'
import { ChevronLeft, Mail, Phone } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { CorporateRequestStatusForm } from '@/components/admin/CorporateRequestStatusForm'
import {
  getCorporateProgram,
  getCorporateRequest,
} from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function AdminCorporateRequestDetailPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const request = await getCorporateRequest(id)
  if (!request) notFound()

  const t = await getTranslations('admin.corporate_requests')
  const isAr = locale === 'ar'

  const program = request.programId
    ? await getCorporateProgram(request.programId)
    : null

  return (
    <div className="space-y-6">
      <Link
        href="/admin/corporate/requests"
        className="font-label inline-flex items-center gap-1 text-[12px] text-fg3 hover:text-fg1"
      >
        <ChevronLeft className="h-3 w-3 rtl:rotate-180" aria-hidden />
        {t('back_to_list')}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-5 rounded-md border border-dashed border-border bg-bg-elevated p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-label text-[10px] text-fg3">{t('name')}</p>
              <p className="text-fg1 text-[20px] font-semibold font-display">
                {request.name}
              </p>
            </div>
            <StatusBadge status={request.status} />
          </header>

          <dl className="grid grid-cols-2 gap-4 border-t border-dashed border-border pt-4 text-[13px]">
            <div>
              <dt className="font-label text-[10px] text-fg3">
                {t('organization')}
              </dt>
              <dd className="text-fg1 font-display font-semibold">
                {request.organization}
              </dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">{t('position')}</dt>
              <dd className="text-fg1">{request.position ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">{t('email')}</dt>
              <dd>
                <a
                  href={`mailto:${request.email}`}
                  className="text-accent hover:underline inline-flex items-center gap-1"
                >
                  <Mail className="h-3 w-3" aria-hidden />
                  {request.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">{t('phone')}</dt>
              <dd>
                {request.phone ? (
                  <a
                    href={`tel:${request.phone}`}
                    className="text-accent hover:underline inline-flex items-center gap-1"
                    dir="ltr"
                  >
                    <Phone className="h-3 w-3" aria-hidden />
                    {request.phone}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">{t('program')}</dt>
              <dd className="text-fg1">
                {program ? (
                  <Link
                    href={`/admin/corporate/programs/${program.id}/edit`}
                    className="hover:text-accent"
                  >
                    {isAr ? program.titleAr : program.titleEn}
                  </Link>
                ) : (
                  <span className="text-fg3">{t('no_program')}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">
                {t('preferred_date')}
              </dt>
              <dd className="text-fg1">{request.preferredDate ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">
                {t('attendee_count')}
              </dt>
              <dd className="text-fg1 num-latn">
                {request.attendeeCount ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="font-label text-[10px] text-fg3">
                {t('received_at')}
              </dt>
              <dd className="text-fg1">
                {request.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
              </dd>
            </div>
          </dl>

          {request.message && (
            <div className="rounded-md border border-border bg-bg-deep p-4">
              <p className="font-label text-[10px] text-fg3 mb-2">
                {t('message')}
              </p>
              <p
                className={`m-0 text-[14px] leading-[1.7] text-fg2 whitespace-pre-wrap ${
                  isAr ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {request.message}
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-4 rounded-md border border-dashed border-border bg-bg-elevated p-6">
          <h2 className="text-fg1 font-display font-semibold text-[14px] uppercase tracking-[0.04em]">
            {t('status_label')}
          </h2>
          <CorporateRequestStatusForm request={request} />
        </aside>
      </div>
    </div>
  )
}
