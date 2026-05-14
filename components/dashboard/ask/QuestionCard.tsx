'use client'

/**
 * Phase B1 — single question card.
 *
 * Layout:
 *   - meta row: relative timestamp · category · "anonymous" tag
 *   - subject (h3-ish)
 *   - body excerpt (line-clamp-2)
 *   - status pill (top-trailing)
 *   - if ANSWERED + answerReference: nested answer card
 *
 * Status pill reuses the project-canonical `StatusBadge`. PENDING → warning,
 * ANSWERED → positive, ARCHIVED → neutral. The labels come from translations
 * keyed off the raw status enum.
 *
 * Answer reference detection: if the value parses as an http(s) URL we
 * render a "Watch the reply" CTA that opens it in a new tab; otherwise we
 * render the value inline as a quote. This is per-spec — admin can paste
 * either an Instagram link or a free-text note.
 */

import { useTranslations } from 'next-intl'
import {
  formatDistanceToNowStrict,
  formatDistanceToNow,
} from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { ExternalLink, Play } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { isHttpUrl } from '@/lib/utils'
import type { ClientUserQuestion } from './AskDrKhaledPage'

type Props = {
  locale: 'ar' | 'en'
  question: ClientUserQuestion
}

export function QuestionCard({ locale, question }: Props) {
  const t = useTranslations('dashboard.ask.list')
  const tCat = useTranslations('dashboard.ask.form')
  const isRtl = locale === 'ar'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'
  const dfnsLocale = isRtl ? ar : enUS

  const createdAt = new Date(question.createdAt)
  const answeredAt = question.answeredAt ? new Date(question.answeredAt) : null

  // Strict for short-form ("2 days ago") to keep cards uniform; the
  // non-strict variant is fine but verbose ("about 2 days ago").
  const relativeCreated = Number.isNaN(createdAt.getTime())
    ? ''
    : formatDistanceToNowStrict(createdAt, {
        addSuffix: true,
        locale: dfnsLocale,
      })
  const relativeAnswered = answeredAt && !Number.isNaN(answeredAt.getTime())
    ? formatDistanceToNow(answeredAt, {
        addSuffix: true,
        locale: dfnsLocale,
      })
    : ''

  const tone =
    question.status === 'PENDING'
      ? 'warning'
      : question.status === 'ANSWERED'
        ? 'positive'
        : 'neutral'

  const statusLabel =
    question.status === 'PENDING'
      ? t('status_pending')
      : question.status === 'ANSWERED'
        ? t('status_answered')
        : t('status_archived')

  const isArchived = question.status === 'ARCHIVED'
  const ref = question.answerReference?.trim() ?? ''
  const refIsUrl = isHttpUrl(ref)
  const body = question.answerBody?.trim() ?? ''
  const hasBody = body.length > 0
  // Split prose into paragraphs on blank lines — mirrors the email template.
  const bodyParagraphs = hasBody
    ? body
        .replace(/\r\n/g, '\n')
        .split(/\n\s*\n/)
        .map((p) => p.replace(/\s+/g, ' ').trim())
        .filter((p) => p.length > 0)
    : []

  return (
    <article
      className={`flex flex-col gap-3.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-6 py-5 transition-[border-color,transform,box-shadow] duration-300 hover:border-[var(--color-border-strong)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] ${
        isArchived ? 'opacity-60' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div
            className={`flex flex-wrap items-center gap-3 text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${
              isRtl
                ? 'font-arabic-body text-[13px]'
                : 'font-display text-[12px]'
            }`}
          >
            <span>{relativeCreated}</span>
            {question.category && (
              <>
                <span
                  aria-hidden
                  className="inline-block h-[3px] w-[3px] rounded-full bg-[var(--color-border-strong)]"
                />
                <span className="font-semibold text-[var(--color-fg2)]">
                  {tCat(`category_${question.category}` as 'category_general')}
                </span>
              </>
            )}
          </div>
          <h3
            className={`m-0 text-[18px] font-bold leading-[1.35] [text-wrap:balance] text-[var(--color-fg1)] font-arabic-display ${
              isRtl ? '' : '!tracking-[-0.01em]'
            }`}
          >
            {question.subject}
          </h3>
        </div>
        <StatusBadge status={question.status} tone={tone} label={statusLabel} />
      </div>

      <p
        className={`m-0 line-clamp-2 text-[var(--color-fg2)] ${
          isRtl
            ? 'font-arabic-body text-[15px] leading-[1.75]'
            : 'font-display text-[14.5px] leading-[1.6]'
        }`}
      >
        {question.body}
      </p>

      {question.status === 'ANSWERED' && (hasBody || ref !== '') && (
        <div className="flex flex-col gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3.5">
          <span
            className={`inline-flex items-center gap-2 text-[var(--color-accent)] ${
              isRtl
                ? 'font-arabic-body text-[13px] font-bold'
                : 'font-display text-[11px] font-bold uppercase tracking-[0.12em]'
            }`}
          >
            {t('answer_eyebrow')}
            {relativeAnswered && (
              <>
                <span aria-hidden>·</span>
                <span
                  className={`text-[var(--color-fg3)] ${
                    isRtl
                      ? 'font-arabic-body !font-normal'
                      : 'font-display !uppercase !tracking-[0.06em] !text-[10px]'
                  }`}
                >
                  {relativeAnswered}
                </span>
              </>
            )}
          </span>
          {hasBody && (
            <div className="flex flex-col gap-2.5">
              {bodyParagraphs.map((p, i) => (
                <p
                  key={i}
                  className={`m-0 text-[var(--color-fg1)] ${
                    isRtl
                      ? 'font-arabic-body text-[15px] leading-[1.85]'
                      : 'font-display text-[14.5px] leading-[1.7]'
                  }`}
                >
                  {p}
                </p>
              ))}
            </div>
          )}
          {refIsUrl && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={ref}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn-pill btn-pill-secondary inline-flex items-center gap-1.5 !py-2 !px-4 !text-[13px] ${fontBody}`}
              >
                <Play
                  aria-hidden
                  className="h-3 w-3 fill-current"
                  strokeWidth={0}
                />
                {t('view_answer')}
                <ExternalLink aria-hidden className="h-3 w-3" />
              </a>
            </div>
          )}
          {/* No body, free-text reference: render inline as quote (legacy
              data from before the answer-body field existed). */}
          {!hasBody && !refIsUrl && ref !== '' && (
            <p
              className={`m-0 text-[var(--color-fg1)] ${
                isRtl
                  ? 'font-arabic-body text-[14.5px] leading-[1.7]'
                  : 'font-display text-[14px] leading-[1.55]'
              }`}
            >
              {ref}
            </p>
          )}
        </div>
      )}
    </article>
  )
}
