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
      <div className="grid h-[calc(100dvh-180px)] grid-cols-[320px_1fr] overflow-hidden rounded-md border border-ink/15 bg-cream-soft">
        <aside className="flex flex-col border-e border-ink/10">
          <div className="flex flex-wrap gap-1 border-b border-ink/10 p-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'font-label rounded-full border border-dashed px-3 py-1 text-[10px]',
                  filter === f
                    ? 'border-amber bg-amber/10 text-amber'
                    : 'border-ink/30 text-ink-muted hover:border-ink',
                )}
              >
                {t(`filter.${f.toLowerCase()}`)}
              </button>
            ))}
          </div>
          <ul className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="p-6 text-center text-[12px] text-ink-muted">{t('empty')}</li>
            ) : (
              filtered.map((m) => {
                const selected = m.id === active?.id
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(m.id)}
                      className={cn(
                        'flex w-full flex-col items-start gap-1 border-b border-ink/10 px-4 py-3 text-start transition-colors',
                        selected ? 'bg-amber/10' : 'hover:bg-cream-warm/40',
                      )}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span
                          className={cn(
                            'truncate text-[13px]',
                            m.status === 'UNREAD' ? 'font-semibold text-ink' : 'text-ink-muted',
                          )}
                        >
                          {m.name}
                        </span>
                        <StatusBadge status={m.status} />
                      </div>
                      <span className="truncate text-[11px] text-ink-muted">{m.subject}</span>
                      <span className="font-label text-[10px] text-ink-muted">
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
            <div className="flex flex-1 items-center justify-center text-[13px] text-ink-muted">
              {t('select_message')}
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-5">
                <div>
                  <h2
                    className="text-ink"
                    style={{
                      fontFamily: 'var(--font-oswald)',
                      fontWeight: 600,
                      fontSize: 18,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {active.subject}
                  </h2>
                  <p className="font-label text-[11px] text-ink-muted">
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
                    className="font-label inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink bg-ink px-3 py-1.5 text-[11px] text-cream-soft hover:bg-transparent hover:text-ink"
                  >
                    <Reply className="h-3.5 w-3.5" aria-hidden />
                    {t('reply')}
                  </button>
                  <button
                    type="button"
                    aria-label={t('toggle_read')}
                    onClick={() => toast.success(tActions('success_saved'))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded text-ink-muted hover:bg-cream-warm/60 hover:text-ink"
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
                    className="inline-flex h-8 w-8 items-center justify-center rounded text-ink-muted hover:bg-cream-warm/60 hover:text-ink"
                  >
                    <Archive className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={tForms('delete')}
                    onClick={() => toast.success(tActions('success_deleted'))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded text-amber/80 hover:bg-amber/15 hover:text-amber"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto p-5">
                <p className="whitespace-pre-line text-[14px] leading-[1.7] text-ink">
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
              className="font-label rounded-full border border-dashed border-ink/40 px-4 py-2 text-[12px] text-ink hover:bg-cream-warm/40"
              style={{ letterSpacing: '0.08em' }}
            >
              {tForms('cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('[admin] would send reply')
                toast.success(t('reply_sent'))
                setReplyOpen(false)
              }}
              className="font-label rounded-full border border-dashed border-ink bg-ink px-4 py-2 text-[12px] text-cream-soft hover:bg-transparent hover:text-ink"
              style={{ letterSpacing: '0.08em' }}
            >
              {t('send_reply')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
