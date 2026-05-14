'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { StatusBadge } from './StatusBadge'
import type { ContactMessage, MessageStatus } from '@/lib/db/queries'
import { cn } from '@/lib/utils'

const FILTERS: ('ALL' | MessageStatus)[] = ['ALL', 'UNREAD', 'READ', 'ARCHIVED']

// Read-only inbox. The previous version exposed reply / toggle-read / archive
// / delete buttons that fired toasts but performed no DB mutation — they led
// the operator to believe a message had been archived when it hadn't. Until
// the actions are implemented (would require schema fields like
// `contact_messages.readAt` and an admin API route that doesn't exist yet),
// the inbox surfaces messages only. Replies happen in the operator's email
// client, not on-site.
export function MessagesInbox({ messages }: { messages: ContactMessage[] }) {
  const t = useTranslations('admin.messages')
  const [filter, setFilter] = useState<'ALL' | MessageStatus>('ALL')
  const [activeId, setActiveId] = useState<string | null>(messages[0]?.id ?? null)

  const filtered = filter === 'ALL' ? messages : messages.filter((m) => m.status === filter)
  const active = filtered.find((m) => m.id === activeId) ?? filtered[0] ?? null

  return (
    <>
      {/* Responsive grid: stacked on mobile (list above detail), two-pane on md+. */}
      <div className="grid h-[calc(100dvh-180px)] grid-cols-1 overflow-hidden rounded-md border border-border bg-bg-elevated md:grid-cols-[320px_1fr]">
        <aside className="flex max-h-[40dvh] flex-col border-b border-border md:max-h-none md:border-b-0 md:border-e md:border-border">
          <div className="flex flex-wrap gap-1 border-b border-border p-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'font-label rounded-full border border-dashed px-3 py-1 text-[10px]',
                  filter === f
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-fg3 hover:border-fg1',
                )}
              >
                {t(`filter.${f.toLowerCase()}`)}
              </button>
            ))}
          </div>
          <ul className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="p-6 text-center text-[12px] text-fg3">{t('empty')}</li>
            ) : (
              filtered.map((m) => {
                const selected = m.id === active?.id
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(m.id)}
                      className={cn(
                        'flex w-full flex-col items-start gap-1 border-b border-border px-4 py-3 text-start transition-colors',
                        selected ? 'bg-accent-soft' : 'hover:bg-bg-deep',
                      )}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span
                          className={cn(
                            'truncate text-[13px]',
                            m.status === 'UNREAD' ? 'font-semibold text-fg1' : 'text-fg3',
                          )}
                        >
                          {m.name}
                        </span>
                        <StatusBadge status={m.status} />
                      </div>
                      <span className="truncate text-[11px] text-fg3">{m.subject}</span>
                      <span className="font-label text-[10px] text-fg3">
                        {m.createdAt.toISOString().slice(0, 10)}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </aside>

        <section className="flex flex-col">
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-[13px] text-fg3">
              {t('select_message')}
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                <div>
                  <h2 className="text-fg1 font-display font-semibold text-[18px] tracking-[-0.02em]">
                    {active.subject}
                  </h2>
                  <p className="font-label text-[11px] text-fg3">
                    {active.name} · {active.email}
                  </p>
                </div>
                <a
                  href={`mailto:${active.email}?subject=${encodeURIComponent(`Re: ${active.subject}`)}`}
                  className="font-label inline-flex items-center gap-1.5 rounded-full border border-dashed border-fg1 bg-fg1 px-3 py-1.5 text-[11px] text-bg hover:bg-transparent hover:text-fg1"
                >
                  {t('reply_via_email')}
                </a>
              </header>
              <div className="flex-1 overflow-y-auto p-5">
                <p className="whitespace-pre-line text-[14px] leading-[1.7] text-fg1">
                  {active.message}
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}
