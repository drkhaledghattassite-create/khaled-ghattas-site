'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import {
  BookOpen,
  Calendar,
  FileEdit,
  FileText,
  Image as ImageIcon,
  Images,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MockUser } from '@/lib/auth/mock'
import { stripLocale } from '@/lib/page-labels'
import { LOCALES } from '@/lib/constants'
import { LogoLink } from '@/components/shared/Logo'

type NavItem = {
  href: string
  key: string
  icon: LucideIcon
}

type NavGroup = {
  key: string
  items: NavItem[]
}

const GROUPS: NavGroup[] = [
  {
    key: 'content',
    items: [
      { href: '/admin', key: 'dashboard', icon: LayoutDashboard },
      { href: '/admin/articles', key: 'articles', icon: FileText },
      { href: '/admin/books', key: 'books', icon: BookOpen },
      { href: '/admin/interviews', key: 'interviews', icon: Video },
      { href: '/admin/gallery', key: 'gallery', icon: Images },
      { href: '/admin/events', key: 'events', icon: Calendar },
    ],
  },
  {
    key: 'commerce',
    items: [
      { href: '/admin/orders', key: 'orders', icon: ShoppingCart },
      { href: '/admin/products', key: 'products', icon: Package },
    ],
  },
  {
    key: 'audience',
    items: [
      { href: '/admin/subscribers', key: 'subscribers', icon: Mail },
      { href: '/admin/messages', key: 'messages', icon: MessageSquare },
      { href: '/admin/users', key: 'users', icon: Users },
    ],
  },
  {
    key: 'site',
    items: [
      { href: '/admin/settings', key: 'settings', icon: Settings },
      { href: '/admin/content', key: 'content', icon: FileEdit },
      { href: '/admin/media', key: 'media', icon: ImageIcon },
    ],
  },
]

export function AdminSidebarContent({
  user,
  onNavigate,
}: {
  user: MockUser
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const tNav = useTranslations('admin.nav')
  const tGroups = useTranslations('admin.groups')
  const tCommon = useTranslations('admin.user')
  const path = stripLocale(pathname, LOCALES)

  return (
    <>
      <div className="flex h-[64px] shrink-0 items-center gap-3 border-b border-ink/10 px-5">
        <LogoLink href="/admin" alt={tCommon('brand')} height={32} />
        <div className="flex flex-col leading-tight">
          <span className="font-label text-[10px] text-ink-muted">{tCommon('panel')}</span>
          <span
            className="text-ink"
            style={{ fontFamily: 'var(--font-oswald)', fontWeight: 600, fontSize: 14, letterSpacing: '0.04em' }}
          >
            {tCommon('brand')}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {GROUPS.map((group) => (
          <div key={group.key} className="mb-5">
            <p className="font-label px-2 pb-2 text-[10px] text-ink-muted">
              {tGroups(group.key)}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === '/admin'
                    ? path === '/admin'
                    : path === item.href || path.startsWith(`${item.href}/`)
                const Icon = item.icon
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'group flex items-center gap-2.5 rounded px-2 py-2 text-[13px] transition-colors',
                        active
                          ? 'bg-amber/10 text-amber'
                          : 'text-ink hover:bg-cream-warm/60',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span>{tNav(item.key)}</span>
                      {active && (
                        <span aria-hidden className="ms-auto h-1.5 w-1.5 rounded-full bg-amber" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink/10 p-3">
        <div className="flex items-center gap-2.5 rounded px-2 py-2">
          <span aria-hidden className="block h-8 w-8 shrink-0 rounded-full bg-ink/80" />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span
              className="truncate text-[13px] text-ink"
              style={{ fontFamily: 'var(--font-oswald)', fontWeight: 500 }}
            >
              {user.name}
            </span>
            <span className="font-label text-[10px] text-amber">{user.role}</span>
          </div>
          <button
            type="button"
            aria-label={tCommon('logout')}
            className="inline-flex h-9 w-9 items-center justify-center rounded text-ink-muted transition-colors hover:bg-cream-warm/80 hover:text-ink"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </>
  )
}

export function AdminSidebar({ user }: { user: MockUser }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col border-e border-ink/10 bg-cream-soft md:flex">
      <AdminSidebarContent user={user} />
    </aside>
  )
}
