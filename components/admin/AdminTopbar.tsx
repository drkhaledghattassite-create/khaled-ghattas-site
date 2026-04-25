'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Bell, ChevronRight, Menu, Plus, Search } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import type { MockUser } from '@/lib/auth/mock'
import { stripLocale } from '@/lib/page-labels'
import { LOCALES } from '@/lib/constants'
import { AdminSidebarContent } from './AdminSidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
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

export function AdminTopbar({ user }: { user: MockUser }) {
  const pathname = usePathname()
  const locale = useLocale()
  const tNav = useTranslations('admin.nav')
  const tCommon = useTranslations('admin.topbar')
  const tForms = useTranslations('admin.forms')
  const tUser = useTranslations('admin.user')
  const path = stripLocale(pathname, LOCALES)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerSide = locale === 'ar' ? 'right' : 'left'

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
    <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between gap-3 border-b border-ink/10 bg-cream/90 px-4 backdrop-blur-sm md:gap-4 md:px-6">
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger
          aria-label={tCommon('quick_actions')}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-ink hover:bg-cream-warm/60 md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </SheetTrigger>
        <SheetContent side={drawerSide} className="flex w-[260px] flex-col bg-cream-soft p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{tUser('panel')}</SheetTitle>
          </SheetHeader>
          <AdminSidebarContent user={user} onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <ol className="font-label flex items-center gap-1.5 text-[11px] text-ink-muted">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {isLast ? (
                  <span className="text-ink" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="transition-colors hover:text-ink">
                    {crumb.label}
                  </Link>
                )}
                {!isLast && <ChevronRight className="h-3 w-3 shrink-0 rtl:rotate-180" aria-hidden />}
              </li>
            )
          })}
        </ol>
        <h1
          className="truncate text-ink"
          style={{ fontFamily: 'var(--font-oswald)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em' }}
        >
          {lastCrumb?.label}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <label className="relative hidden items-center md:flex">
          <Search className="pointer-events-none absolute start-2.5 h-3.5 w-3.5 text-ink-muted" aria-hidden />
          <input
            type="search"
            placeholder={tForms('search')}
            className="h-9 min-w-[260px] rounded-full border border-dashed border-ink/40 bg-transparent ps-8 pe-4 text-[13px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
        </label>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={tCommon('quick_actions')}
            className="font-label inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink px-3 py-1.5 text-[11px] text-ink transition-colors hover:bg-ink hover:text-cream-soft"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {tCommon('new')}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{tCommon('quick_actions')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {QUICK_ACTIONS.map((a) => (
              <DropdownMenuItem key={a.key} render={<Link href={a.href} />}>
                {tCommon(a.key)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          aria-label={tCommon('notifications')}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-cream-warm/60 hover:text-ink"
        >
          <Bell className="h-4 w-4" aria-hidden />
          <span className="absolute -end-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber px-1 text-[9px] font-medium text-cream">
            3
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={user.name}
            className="flex h-9 items-center gap-2 rounded-full border border-dashed border-ink/40 ps-1 pe-3 text-[13px] text-ink transition-colors hover:bg-cream-warm/40"
          >
            <span aria-hidden className="block h-7 w-7 rounded-full bg-ink/80" />
            <span className="hidden sm:inline">{user.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/admin/settings" />}>
              {tNav('settings')}
            </DropdownMenuItem>
            <DropdownMenuItem>{tCommon('logout')}</DropdownMenuItem>
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
