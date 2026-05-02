'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Archive, Mail, MailOpen, Reply, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from './StatusBadge'
import type { ContactMessage, MessageStatus } from '@/lib/db/queries'
import { cn } from '@/lib/utils'

const FILTERS: ('ALL' | MessageStatus)[] = ['ALL', 'UNREAD', 'READ', 'ARCHIVED']

export function MessagesInbox({ messages }: { messages: ContactMessage[] }) {
  const t = useTranslations('admin.messages')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const [filter, setFilter] = useState<'ALL' | MessageStatus>('ALL')
  const [activeId, setActiveId] = useState<string | null>(messages[0]?.id ?? null)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyBody, setReplyBody] = useState('')

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
                  <h2
                    className="text-fg1 font-display font-semibold text-[18px] tracking-[-0.02em]"
                  >
                    {active.subject}
                  </h2>
                  <p className="font-label text-[11px] text-fg3">
                    {active.name} · {active.email}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={t('reply')}
                    onClick={() => {
                      setReplyBody('')
                      setReplyOpen(true)
                    }}
                    className="font-label inline-flex items-center gap-1.5 rounded-full border border-dashed border-fg1 bg-fg1 px-3 py-1.5 text-[11px] text-bg hover:bg-transparent hover:text-fg1"
                  >
                    <Reply className="h-3.5 w-3.5" aria-hidden />
                    {t('reply')}
                  </button>
                  <button
                    type="button"
                    aria-label={t('toggle_read')}
                    onClick={() => toast.success(tActions('success_saved'))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
                  >
                    {active.status === 'UNREAD' ? (
                      <MailOpen className="h-4 w-4" aria-hidden />
                    ) : (
                      <Mail className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={t('archive')}
                    onClick={() => toast.success(tActions('success_saved'))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1"
                  >
                    <Archive className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={tForms('delete')}
                    onClick={() => toast.success(tActions('success_deleted'))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded text-accent/80 hover:bg-accent-soft hover:text-accent"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
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

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reply')}</DialogTitle>
            <DialogDescription>
              {active && `${t('to')} ${active.email}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={active ? `Re: ${active.subject}` : ''} readOnly />
            <Textarea
              rows={8}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={t('reply_placeholder')}
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setReplyOpen(false)}
              className="font-label rounded-full border border-dashed border-border px-4 py-2 text-[12px] text-fg1 hover:bg-bg-deep"
            >
              {tForms('cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                // TODO(phase-5): wire to /api/admin/messages reply endpoint.
                toast.success(t('reply_sent'))
                setReplyOpen(false)
              }}
              className="font-label rounded-full border border-dashed border-fg1 bg-fg1 px-4 py-2 text-[12px] text-bg hover:bg-transparent hover:text-fg1"
            >
              {t('send_reply')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
