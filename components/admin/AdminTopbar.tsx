'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
// Removed Bell + Search icons along with the dead search input and unwired
// notifications bell. They'll come back in a later phase when the search and
// notifications backends exist; until then hiding empty UI is more honest.
import { ChevronRight, Menu, Plus } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
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

export function AdminTopbar({
  user,
  pendingQuestionCount = 0,
  draftTestCount = 0,
  emailQueueAttentionCount = 0,
}: {
  user: ServerSessionUser
  pendingQuestionCount?: number
  draftTestCount?: number
  emailQueueAttentionCount?: number
}) {
  const pathname = usePathname()
  const locale = useLocale()
  const tNav = useTranslations('admin.nav')
  const tCommon = useTranslations('admin.topbar')
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
    <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur-sm md:gap-4 md:px-6">
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger
          aria-label={tCommon('quick_actions')}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-fg1 hover:bg-bg-deep md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </SheetTrigger>
        <SheetContent
          side={drawerSide}
          className="flex w-[min(88vw,300px)] flex-col bg-bg-elevated p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{tUser('panel')}</SheetTitle>
          </SheetHeader>
          <AdminSidebarContent
            user={user}
            pendingQuestionCount={pendingQuestionCount}
            draftTestCount={draftTestCount}
            emailQueueAttentionCount={emailQueueAttentionCount}
            onNavigate={() => setDrawerOpen(false)}
          />
          {/* Mobile-only theme + locale switchers. On desktop these live in
              the topbar (hidden below sm in the right-cluster below), so they
              were unreachable on phones until now. */}
          <div className="flex items-center justify-around gap-2 border-t border-border p-3">
            <ThemeToggle />
            <LocaleSwitcher />
          </div>
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
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-fg1 bg-fg1 px-3 py-1.5 text-[12px] uppercase tracking-[0.08em] text-bg font-display font-semibold transition-colors hover:bg-accent hover:border-accent hover:text-accent-fg md:min-h-9 md:text-[11px]"
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
            admins can flip dark/light and AR/EN without leaving /admin.
            The user-menu (avatar + email + logout) used to live here but
            was a visual duplicate of the user card at the bottom of the
            sidebar — sign-out and settings are reachable from there now. */}
        <span className="hidden sm:inline-flex">
          <ThemeToggle />
        </span>
        <span className="hidden sm:inline-flex">
          <LocaleSwitcher />
        </span>
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
    questions: 'questions',
    tests: 'tests',
    analytics: 'analytics',
    new: 'new',
    edit: 'edit',
  }
  return map[segment] ?? null
}
