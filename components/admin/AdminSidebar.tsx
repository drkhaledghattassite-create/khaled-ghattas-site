'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import {
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileEdit,
  FileText,
  Gift,
  HelpCircle,
  Heart,
  Image as ImageIcon,
  Images,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MapPin,
  Mail,
  MessageSquare,
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
  /** Optional count badge rendered after the label. Used by the Questions
   *  entry to surface the pending queue size at a glance. Falsy values
   *  (0, null, undefined) hide the badge — we don't want a "0" chip
   *  shouting on an empty queue. */
  badgeCount?: number
  /** Translation key (under `admin.nav`) used for the badge's
   *  screen-reader label. The key MUST accept a `{count}` placeholder
   *  so the announcement reads "3 pending questions" (or whatever
   *  semantically matches the count). Without this, screen-reader
   *  users hear a bare number with no context. */
  badgeAriaLabelKey?: string
}

type NavGroup = {
  key: string
  items: NavItem[]
}

// Builds the admin sidebar nav. Every section is always rendered — the
// admin viewing this panel IS the operator, so hiding their own sections
// from themselves never made sense. The earlier `show_admin_*` site
// settings were removed; only the live count badges (pending questions,
// draft tests, email-queue attention) remain.
function buildGroups(
  pendingQuestionCount: number,
  draftTestCount: number,
  emailQueueAttentionCount: number,
): NavGroup[] {
  const audienceItems: NavItem[] = [
    { href: '/admin/subscribers', key: 'subscribers', icon: Mail },
    { href: '/admin/messages', key: 'messages', icon: MessageSquare },
    { href: '/admin/users', key: 'users', icon: Users },
    {
      href: '/admin/questions',
      key: 'questions',
      icon: HelpCircle,
      badgeCount: pendingQuestionCount,
      badgeAriaLabelKey: 'questions_pending_aria',
    },
  ]

  const contentItems: NavItem[] = [
    { href: '/admin', key: 'dashboard', icon: LayoutDashboard },
    { href: '/admin/articles', key: 'articles', icon: FileText },
    { href: '/admin/books', key: 'books', icon: BookOpen },
    { href: '/admin/interviews', key: 'interviews', icon: Video },
    { href: '/admin/gallery', key: 'gallery', icon: Images },
    { href: '/admin/events', key: 'events', icon: Calendar },
    {
      href: '/admin/tests',
      key: 'tests',
      icon: ClipboardList,
      badgeCount: draftTestCount,
      badgeAriaLabelKey: 'tests_drafts_aria',
    },
  ]

  return [
    { key: 'content', items: contentItems },
    {
      key: 'commerce',
      items: [
        { href: '/admin/orders', key: 'orders', icon: ShoppingCart },
        { href: '/admin/gifts', key: 'gifts', icon: Gift },
      ],
    },
    { key: 'audience', items: audienceItems },
    {
      key: 'corporate',
      items: [
        {
          href: '/admin/corporate',
          key: 'corporate_overview',
          icon: LayoutDashboard,
          exact: true,
        },
        { href: '/admin/corporate/programs', key: 'corporate_programs', icon: Briefcase },
        { href: '/admin/corporate/clients', key: 'corporate_clients', icon: Building2 },
        { href: '/admin/corporate/requests', key: 'corporate_requests', icon: Send },
      ],
    },
    {
      key: 'booking',
      items: [
        {
          href: '/admin/booking',
          key: 'booking_overview',
          icon: LayoutDashboard,
          exact: true,
        },
        { href: '/admin/booking/tours', key: 'booking_tours', icon: MapPin },
        { href: '/admin/booking/bookings', key: 'booking_bookings', icon: CalendarDays },
        {
          href: '/admin/booking/tour-suggestions',
          key: 'booking_tour_suggestions',
          icon: Lightbulb,
        },
        { href: '/admin/booking/interest', key: 'booking_interest', icon: Heart },
        { href: '/admin/booking/orders', key: 'booking_orders', icon: CreditCard },
      ],
    },
    {
      key: 'site',
      items: [
        { href: '/admin/settings', key: 'settings', icon: Settings, exact: true },
        { href: '/admin/settings/site', key: 'site_settings', icon: SlidersHorizontal },
        { href: '/admin/content', key: 'content', icon: FileEdit },
        { href: '/admin/media', key: 'media', icon: ImageIcon },
        {
          href: '/admin/email-queue',
          key: 'email_queue',
          icon: Inbox,
          badgeCount: emailQueueAttentionCount,
          badgeAriaLabelKey: 'email_queue_attention_aria',
        },
      ],
    },
  ]
}

export function AdminSidebarContent({
  user,
  onNavigate,
  pendingQuestionCount = 0,
  draftTestCount = 0,
  emailQueueAttentionCount = 0,
}: {
  user: ServerSessionUser
  onNavigate?: () => void
  /**
   * Number of PENDING user questions awaiting review. Drives the count
   * badge on the Questions sidebar entry. 0 hides the badge.
   */
  pendingQuestionCount?: number
  /**
   * Number of unpublished tests. Drives the badge on the Tests sidebar
   * entry; 0 hides it.
   */
  draftTestCount?: number
  /**
   * Count of EXHAUSTED + FAILED email-queue rows. Drives the
   * "attention needed" badge on the Email queue sidebar entry.
   */
  emailQueueAttentionCount?: number
}) {
  const pathname = usePathname()
  const tNav = useTranslations('admin.nav')
  const tGroups = useTranslations('admin.groups')
  const tCommon = useTranslations('admin.user')
  const path = stripLocale(pathname, LOCALES)
  const groups = buildGroups(
    pendingQuestionCount,
    draftTestCount,
    emailQueueAttentionCount,
  )

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
        {groups.map((group) => (
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
                      {/* Count badge first (e.g., pending questions); active
                          dot only when the entry has no badge to show.
                          Both can't be useful at once — the badge already
                          implies meaningful state.

                          For screen readers we hide the bare-number visual
                          (aria-hidden on the digit) and surface a
                          semantic SR-only label via the badge wrapper's
                          aria-label, e.g. "3 pending questions" rather
                          than just "3" with no context. */}
                      {item.badgeCount && item.badgeCount > 0 ? (
                        <span
                          className="ms-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-display font-bold leading-none text-accent-fg [font-feature-settings:'tnum']"
                          aria-label={
                            item.badgeAriaLabelKey
                              ? tNav(
                                  // narrow to the typed nav-key set; this
                                  // key must exist in messages/{ar,en}.json
                                  // under `admin.nav` and accept `{count}`
                                  item.badgeAriaLabelKey as 'questions_pending_aria',
                                  { count: item.badgeCount },
                                )
                              : undefined
                          }
                        >
                          <span aria-hidden="true">
                            {item.badgeCount > 99 ? '99+' : item.badgeCount}
                          </span>
                        </span>
                      ) : active ? (
                        <span aria-hidden className="ms-auto h-1.5 w-1.5 rounded-full bg-accent" />
                      ) : null}
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

export function AdminSidebar({
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
  return (
    <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col overflow-hidden border-e border-border bg-bg-elevated md:flex">
      <AdminSidebarContent
        user={user}
        pendingQuestionCount={pendingQuestionCount}
        draftTestCount={draftTestCount}
        emailQueueAttentionCount={emailQueueAttentionCount}
      />
    </aside>
  )
}
