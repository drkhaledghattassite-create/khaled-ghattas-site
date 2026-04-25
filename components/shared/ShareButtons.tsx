'use client'

import { useTranslations } from 'next-intl'
import { FacebookIcon, TwitterIcon, WhatsAppIcon } from './social-icons'

type Props = { url: string; title: string }

const PILL = 'group relative inline-flex items-center gap-2 rounded-full border border-dashed border-ink px-3 py-1.5 text-[12px] text-ink transition-colors duration-300 hover:bg-ink hover:text-cream-soft'

export function ShareButtons({ url, title }: Props) {
  const t = useTranslations('article.share')
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
      <span className="font-label me-xs text-[12px] text-ink-muted">{t('label')}</span>
      {links.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={PILL}
          style={{ letterSpacing: '0.08em' }}
          aria-label={label}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          <span className="font-label">{label}</span>
        </a>
      ))}
    </div>
  )
}
