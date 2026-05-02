'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
// Removed Bell + Search icons along with the dead search input and unwired
// notifications bell. They'll come back in a later phase when the search and
// notifications backends exist; until then hiding empty UI is more honest.
import { ChevronRight, Menu, Plus } from 'lucide-react'
import { Link, useRouter } from '@/lib/i18n/navigation'
import { authClient } from '@/lib/auth/client'
import type { ServerSessionUser } from '@/lib/auth/server'
import { stripLocale } from '@/lib/page-labels'
import { LOCALES } from '@/lib/constants'
import { AdminSidebarContent } from './AdminSidebar'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const QUICK_ACTIONS = [
  { href: '/admin/articles/new', key: 'new_article' },
  { href: '/admin/books/new', key: 'new_book' },
  { href: '/admin/events/new', key: 'new_event' },
] as const

export function AdminTopbar({ user }: { user: ServerSessionUser }) {
  const pathname = usePathname()
  const locale = useLocale()
  const router = useRouter()
  const tNav = useTranslations('admin.nav')
  const tCommon = useTranslations('admin.topbar')
  const tUser = useTranslations('admin.user')
  const path = stripLocale(pathname, LOCALES)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerSide = locale === 'ar' ? 'right' : 'left'

  async function handleSignOut() {
    try {
      await authClient.signOut()
    } catch (err) {
      console.error('[AdminTopbar signOut]', err)
    }
    router.push('/login')
  }

  const segments = path.split('/').filter(Boolean) // ['admin', ...]
  const crumbs: { href: string; label: string }[] = []
  let acc = ''
  for (const seg of segments) {
    acc += `/${seg}`
    if (seg === 'admin') {
      crumbs.push({ href: acc, label: tNav('dashboard') })
      continue
    }
    const navKey = lookupNavKey(seg)
    crumbs.push({
      href: acc,
      label: navKey ? tNav(navKey) : seg.replace(/-/g, ' '),
    })
  }
  const lastCrumb = crumbs[crumbs.length - 1]

  return (
    <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur-sm md:gap-4 md:px-6">
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger
          aria-label={tCommon('quick_actions')}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-fg1 hover:bg-bg-deep md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </SheetTrigger>
        <SheetContent side={drawerSide} className="flex w-[260px] flex-col bg-bg-elevated p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{tUser('panel')}</SheetTitle>
          </SheetHeader>
          <AdminSidebarContent user={user} onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <ol className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-fg3 font-display">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {isLast ? (
                  <span className="text-fg1" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="transition-colors hover:text-fg1">
                    {crumb.label}
                  </Link>
                )}
                {!isLast && <ChevronRight className="h-3 w-3 shrink-0 rtl:rotate-180" aria-hidden />}
              </li>
            )
          })}
        </ol>
        <h1 className="truncate text-fg1 font-display font-semibold text-[22px] tracking-[-0.02em]">
          {lastCrumb?.label}
        </h1>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* TODO(phase-2): wire a global admin search across articles, books,
            interviews, events, orders, users. Removed the dead input on
            2026-05-02 — empty placeholder UI was misleading. */}
        {/* TODO(phase-2): notifications bell removed — there's no real
            notification stream wired yet. Re-add when a feed source exists. */}

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={tCommon('quick_actions')}
            className="inline-flex items-center gap-1.5 rounded-full border border-fg1 bg-fg1 px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-bg font-display font-semibold transition-colors hover:bg-accent hover:border-accent hover:text-accent-fg"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {tCommon('new')}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{tCommon('quick_actions')}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {QUICK_ACTIONS.map((a) => (
              <DropdownMenuItem key={a.key} render={<Link href={a.href} />}>
                {tCommon(a.key)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme + locale toggles, mirroring the public site header so
            admins can flip dark/light and AR/EN without leaving /admin. */}
        <span className="hidden sm:inline-flex">
          <ThemeToggle />
        </span>
        <span className="hidden sm:inline-flex">
          <LocaleSwitcher />
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={user.name}
            className="flex h-9 max-w-[160px] items-center gap-2 rounded-full border border-border ps-1 pe-3 text-[13px] text-fg1 transition-colors hover:bg-bg-deep md:max-w-[220px]"
          >
            <span aria-hidden className="block h-7 w-7 shrink-0 rounded-full bg-fg1/80" />
            <span className="hidden truncate sm:inline">{user.name}</span>
          </DropdownMenuTrigger>
          {/* min-w-[260px] gives long emails (e.g., kamallchhimi@gmail.com)
              room to render without horizontal-clip truncation that hid the
              first few characters in RTL. */}
          <DropdownMenuContent align="end" className="min-w-[260px]">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block max-w-[240px] truncate" dir="ltr" title={user.email}>
                  {user.email}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/admin/settings" />}>
              {tNav('settings')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>{tCommon('logout')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

function lookupNavKey(segment: string): string | null {
  const map: Record<string, string> = {
    articles: 'articles',
    books: 'books',
    interviews: 'interviews',
    gallery: 'gallery',
    events: 'events',
    orders: 'orders',
    products: 'products',
    subscribers: 'subscribers',
    messages: 'messages',
    users: 'users',
    settings: 'settings',
    content: 'content',
    media: 'media',
    new: 'new',
    edit: 'edit',
  }
  return map[segment] ?? null
}
