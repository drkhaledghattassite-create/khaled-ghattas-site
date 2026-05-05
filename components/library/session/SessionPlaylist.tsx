'use client'

import { CheckCircle2, FileText, Headphones, PlayCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion/hooks'
import type { SessionItem, SessionItemType } from '@/lib/db/schema'

export type PlaylistProgress = {
  lastPositionSeconds: number
  completedAt: string | null
}

const TYPE_ICONS: Record<SessionItemType, typeof PlayCircle> = {
  VIDEO: PlayCircle,
  AUDIO: Headphones,
  PDF: FileText,
}

// Tone classes lean on the existing semantic tone tokens used by the
// admin StatusBadge — VIDEO=info, AUDIO=warning, PDF=positive. Keeping
// the same mapping the admin uses means a "VIDEO" chip in the customer
// playlist visually matches the chip in the admin editor's row.
const TYPE_TONE: Record<SessionItemType, string> = {
  VIDEO: 'bg-info-soft text-info',
  AUDIO: 'bg-warning-soft text-warning',
  PDF: 'bg-success-soft text-success',
}

function formatDuration(totalSeconds: number | null): string {
  if (
    totalSeconds == null ||
    !Number.isFinite(totalSeconds) ||
    totalSeconds <= 0
  ) {
    return ''
  }
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`
  return `${minutes}:${pad(seconds)}`
}

function progressPercent(
  positionSeconds: number,
  durationSeconds: number | null,
): number {
  if (
    durationSeconds == null ||
    durationSeconds <= 0 ||
    positionSeconds <= 0
  ) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round((positionSeconds / durationSeconds) * 100)))
}

export function SessionPlaylist({
  items,
  activeItemId,
  progress,
  locale,
  onSelect,
}: {
  items: SessionItem[]
  activeItemId: string
  progress: Record<string, PlaylistProgress>
  locale: 'ar' | 'en'
  onSelect: (itemId: string) => void
}) {
  const t = useTranslations('session')
  const tType = useTranslations('session.type')
  const isRtl = locale === 'ar'
  const reduceMotion = useReducedMotion()
  const fontDisplay = isRtl ? 'font-arabic-body' : 'font-display'
  const fontHeading = 'font-arabic-display'

  return (
    <section
      aria-label={t('playlist.label')}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 lg:p-5"
    >
      <header className="flex items-baseline justify-between gap-3 pb-2 border-b border-[var(--color-border)]">
        <h2
          className={`m-0 text-[15px] leading-[1.2] font-bold text-[var(--color-fg1)] ${fontHeading}`}
        >
          {t('playlist.label')}
        </h2>
        <span
          className={`text-[12px] text-[var(--color-fg3)] ${fontDisplay}`}
        >
          {t('playlist.items_count', { count: items.length })}
        </span>
      </header>

      <ol className="flex flex-col gap-1">
        {items.map((item, index) => {
          const Icon = TYPE_ICONS[item.itemType]
          const isActive = item.id === activeItemId
          const itemProgress = progress[item.id]
          const completed = itemProgress?.completedAt != null
          const percent = completed
            ? 100
            : progressPercent(
                itemProgress?.lastPositionSeconds ?? 0,
                item.durationSeconds ?? null,
              )
          const inProgress = !completed && percent > 0
          const interactionLabel =
            item.itemType === 'PDF'
              ? t('playlist.click_to_open_pdf')
              : t('playlist.click_to_play')

          return (
            <motion.li
              key={item.id}
              initial={
                reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: reduceMotion ? 0 : Math.min(index * 0.03, 0.18),
              }}
              className="list-none"
            >
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`${item.title} — ${interactionLabel}`}
                className={`group relative flex w-full items-start gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-start transition-colors border-s-2 ${
                  isActive
                    ? 'bg-[var(--color-accent-soft)] border-s-[var(--color-accent)]'
                    : 'bg-transparent border-s-transparent hover:bg-[var(--color-bg-deep)]'
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TYPE_TONE[item.itemType]}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>

                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex items-center gap-2">
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] font-display font-semibold ${TYPE_TONE[item.itemType]}`}
                    >
                      {tType(item.itemType.toLowerCase() as 'video' | 'audio' | 'pdf')}
                    </span>
                    {isActive && (
                      <span
                        className={`inline-flex items-center rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] font-display font-semibold text-[var(--color-accent-fg)]`}
                      >
                        {t('now_playing')}
                      </span>
                    )}
                    {completed && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] text-success font-display font-semibold"
                        title={t('playlist.completed_indicator')}
                      >
                        <CheckCircle2 className="h-3 w-3" aria-hidden />
                        {t('playlist.completed_indicator')}
                      </span>
                    )}
                  </span>

                  <span
                    className={`block truncate text-[14px] font-semibold leading-[1.3] ${
                      isActive ? 'text-[var(--color-fg1)]' : 'text-[var(--color-fg1)]'
                    } ${fontHeading}`}
                  >
                    {item.title}
                  </span>

                  {item.description ? (
                    <span
                      className={`block truncate text-[12px] leading-[1.4] text-[var(--color-fg3)] ${fontDisplay}`}
                    >
                      {item.description}
                    </span>
                  ) : null}

                  <span
                    className={`flex items-center gap-2 text-[11px] text-[var(--color-fg3)] ${fontDisplay}`}
                  >
                    <span dir="ltr" className="num-latn">
                      {item.itemType === 'PDF'
                        ? t('playlist.duration_pdf')
                        : formatDuration(item.durationSeconds) || '—'}
                    </span>
                    {inProgress && (
                      <span
                        className="inline-flex items-center gap-1 text-[var(--color-accent)]"
                        title={t('playlist.in_progress')}
                      >
                        <span
                          aria-hidden
                          className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
                        />
                        <span dir="ltr" className="num-latn">
                          {percent}%
                        </span>
                      </span>
                    )}
                  </span>

                  {(inProgress || completed) && (
                    <span
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={
                        completed
                          ? t('playlist.completed_indicator')
                          : t('playlist.in_progress')
                      }
                      className="relative block h-1 w-full overflow-hidden rounded-full bg-[var(--color-bg-deep)] border border-[var(--color-border)]"
                    >
                      <span
                        aria-hidden
                        className={`absolute inset-y-0 [inset-inline-start:0] block rounded-full transition-[width] duration-500 ${
                          completed
                            ? 'bg-success'
                            : 'bg-[var(--color-accent)]'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                  )}
                </span>
              </button>
            </motion.li>
          )
        })}
      </ol>
    </section>
  )
}
