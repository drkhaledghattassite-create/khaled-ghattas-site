'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import {
  BookOpen,
  Briefcase,
  Building2,
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
  Send,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ServerSessionUser } from '@/lib/auth/server'
import { stripLocale } from '@/lib/page-labels'
import { LOCALES } from '@/lib/constants'
import { LogoLink } from '@/components/shared/Logo'

type NavItem = {
  href: string
  key: string
  icon: LucideIcon
  /** When true, only highlight on exact path match. Use for parent items
   *  whose sub-routes have their own sidebar entry (e.g. /admin/settings vs.
   *  /admin/settings/site). */
  exact?: boolean
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
    key: 'corporate',
    items: [
      { href: '/admin/corporate/programs', key: 'corporate_programs', icon: Briefcase },
      { href: '/admin/corporate/clients', key: 'corporate_clients', icon: Building2 },
      { href: '/admin/corporate/requests', key: 'corporate_requests', icon: Send },
    ],
  },
  {
    key: 'site',
    items: [
      { href: '/admin/settings', key: 'settings', icon: Settings, exact: true },
      { href: '/admin/settings/site', key: 'site_settings', icon: SlidersHorizontal },
      { href: '/admin/content', key: 'content', icon: FileEdit },
      { href: '/admin/media', key: 'media', icon: ImageIcon },
    ],
  },
]

export function AdminSidebarContent({
  user,
  onNavigate,
}: {
  user: ServerSessionUser
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const tNav = useTranslations('admin.nav')
  const tGroups = useTranslations('admin.groups')
  const tCommon = useTranslations('admin.user')
  const path = stripLocale(pathname, LOCALES)

  return (
    <>
      <div className="flex h-[64px] shrink-0 items-center gap-3 border-b border-border px-5">
        <LogoLink href="/admin" alt={tCommon('brand')} height={32} />
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-[0.12em] text-fg3 font-display font-semibold">
            {tCommon('panel')}
          </span>
          <span className="text-fg1 font-display font-semibold text-[14px] tracking-[0.04em]">
            {tCommon('brand')}
          </span>
        </div>
      </div>

      {/* min-h-0 lets this flex child shrink so overflow-y-auto actually
          engages instead of growing the parent. overscroll-contain stops
          wheel/touch scroll from chaining into the page underneath.
          data-lenis-prevent tells the global Lenis smooth-scroll instance
          (mounted in LenisProvider) to ignore wheel events here so the
          inner nav owns its own scroll instead of Lenis hijacking the
          wheel for the document. */}
      <nav
        data-lenis-prevent
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-gutter:stable]"
      >
        {GROUPS.map((group) => (
          <div key={group.key} className="mb-5">
            <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.12em] text-fg3 font-display font-semibold">
              {tGroups(group.key)}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.exact
                  ? path === item.href
                  : item.href === '/admin'
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
                          ? 'bg-accent-soft text-accent'
                          : 'text-fg1 hover:bg-bg-deep',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span>{tNav(item.key)}</span>
                      {active && (
                        <span aria-hidden className="ms-auto h-1.5 w-1.5 rounded-full bg-accent" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded px-2 py-2">
          <span aria-hidden className="block h-8 w-8 shrink-0 rounded-full bg-fg1/80" />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[13px] text-fg1 font-display font-medium">
              {user.name}
            </span>
            <span className="text-[10px] uppercase tracking-[0.08em] text-accent font-display font-semibold">
              {user.role}
            </span>
          </div>
          <button
            type="button"
            aria-label={tCommon('logout')}
            className="inline-flex h-9 w-9 items-center justify-center rounded text-fg3 transition-colors hover:bg-bg-deep hover:text-fg1"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </>
  )
}

export function AdminSidebar({ user }: { user: ServerSessionUser }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col overflow-hidden border-e border-border bg-bg-elevated md:flex">
      <AdminSidebarContent user={user} />
    </aside>
  )
}
