'use client'

import { useLocale, useTranslations } from 'next-intl'
import { FacebookIcon, TwitterIcon, WhatsAppIcon } from './social-icons'

type Props = { url: string; title: string }

export function ShareButtons({ url, title }: Props) {
  const t = useTranslations('article.share')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const links = [
    {
      label: t('twitter'),
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      Icon: TwitterIcon,
    },
    {
      label: t('facebook'),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      Icon: FacebookIcon,
    },
    {
      label: t('whatsapp'),
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      Icon: WhatsAppIcon,
    },
  ] as const

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`me-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] ${
          isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
        }`}
      >
        {t('label')}
      </span>
      {links.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[var(--color-fg2)] transition-colors duration-200 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-fg)]"
          aria-label={label}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </a>
      ))}
    </div>
  )
}
