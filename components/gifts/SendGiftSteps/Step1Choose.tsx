'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { EASE_EDITORIAL } from '@/lib/motion/variants'
import { fmtAmount, type SelectedItem, type Tab } from './types'

type Props = {
  isRtl: boolean
  locale: string
  tab: Tab
  setTab: (t: Tab) => void
  items: SelectedItem[]
  selected: SelectedItem | null
  onSelect: (item: SelectedItem) => void
  counts: Record<Tab, number>
}

export function Step1Choose({
  isRtl,
  locale,
  tab,
  setTab,
  items,
  selected,
  onSelect,
  counts,
}: Props) {
  const t = useTranslations('gifts.send')
  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h2
          className={`m-0 text-[clamp(22px,3vw,28px)] font-bold leading-[1.15] text-[var(--color-fg1)] ${fontDisplay}`}
        >
          {t('step_titles.item')}
        </h2>
        <p
          className={`m-0 text-[15px] leading-[1.55] text-[var(--color-fg2)] ${fontBody}`}
        >
          {t('step_subs.item')}
        </p>
      </header>

      <div
        role="tablist"
        aria-label={t('step_titles.item')}
        className="flex flex-wrap gap-1 border-b border-[var(--color-border)]"
      >
        {(['book', 'session', 'booking'] as Tab[]).map((tabKey) => {
          const active = tab === tabKey
          return (
            <button
              key={tabKey}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(tabKey)}
              className={`relative px-4 py-3 text-[14px] font-semibold transition-colors ${
                active
                  ? 'text-[var(--color-fg1)]'
                  : 'text-[var(--color-fg3)] hover:text-[var(--color-fg2)]'
              } ${fontBody}`}
            >
              <span className="inline-flex items-center gap-2">
                {t(`tabs.${tabKey}`)}
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-[var(--radius-pill)] text-[11px] font-semibold ${
                    active
                      ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                      : 'bg-[var(--color-bg-deep)] text-[var(--color-fg3)]'
                  }`}
                >
                  {counts[tabKey]}
                </span>
              </span>
              {active && (
                <motion.span
                  layoutId="gift-tab-rule"
                  transition={{ duration: 0.3, ease: EASE_EDITORIAL }}
                  className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--color-accent)]"
                />
              )}
            </button>
          )
        })}
      </div>

      {items.length === 0 ? (
        <div
          className={`rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-deep)] p-8 text-center text-[14px] text-[var(--color-fg3)] ${fontBody}`}
        >
          {t(
            tab === 'book'
              ? 'empty_books'
              : tab === 'session'
                ? 'empty_sessions'
                : 'empty_bookings',
          )}
        </div>
      ) : (
        <ul
          role="radiogroup"
          aria-label={t('step_titles.item')}
          className="m-0 p-0 list-none grid gap-3"
        >
          {items.map((item) => {
            const isSelected =
              selected?.id === item.id && selected?.type === item.type
            const title = isRtl ? item.titleAr : item.titleEn
            return (
              <li key={`${item.type}-${item.id}`}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSelect(item)}
                  className={`group w-full text-start rounded-[var(--radius-lg)] border transition-all flex items-stretch gap-4 p-3 ${
                    isSelected
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  <span
                    className="relative shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-bg-deep)] w-[72px] h-[96px] sm:w-[80px] sm:h-[108px]"
                    aria-hidden="true"
                  >
                    {item.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.coverImage}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[var(--color-accent)]">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 7l9-4 9 4" />
                          <path d="M5 8v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
                          <path d="M9 19v-7h6v7" />
                        </svg>
                      </span>
                    )}
                  </span>

                  <span className="flex-1 min-w-0 grid content-between gap-2 py-1">
                    <span className="grid gap-1">
                      <span
                        className={`block text-[15px] font-semibold leading-[1.3] text-[var(--color-fg1)] line-clamp-2 ${fontBody}`}
                      >
                        {title}
                      </span>
                      <span
                        className={`block text-[12px] text-[var(--color-fg3)] uppercase tracking-[0.06em] ${
                          isRtl ? 'font-arabic-body normal-case tracking-normal' : 'font-display'
                        }`}
                      >
                        {t(`tabs.${item.type}`)}
                      </span>
                    </span>
                    <span
                      className={`block text-[13px] font-semibold text-[var(--color-fg2)] ${fontBody}`}
                    >
                      {fmtAmount(item.priceCents, item.currency, locale)}
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    className={`shrink-0 self-center inline-flex items-center justify-center w-6 h-6 rounded-full border transition-all ${
                      isSelected
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
                        : 'border-[var(--color-border-strong)] bg-transparent text-transparent'
                    }`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
