/**
 * Build the visible header/footer nav items from current site settings.
 *
 * One source of truth — used by BOTH the public layout and the dashboard
 * layout so logged-in users see the same filtered nav as guests. Anywhere
 * SiteHeader/SiteFooter renders, this function decides what's in the list.
 *
 * `home` is always present. Every other item is gated only by its
 * `show_nav_*` toggle. Coming-soon pages still appear in nav — clicking
 * one renders the coming-soon screen instead of the page content. Hide
 * (nav toggle) and Coming Soon are independent concerns.
 */

import type { NavItem } from '@/components/layout/SiteHeader'
import type { SiteSettings } from './types'

export function buildNavItems(settings: SiteSettings): NavItem[] {
  const { navigation } = settings
  const items: NavItem[] = [{ key: 'home', href: '/' }]
  if (navigation.show_nav_about) items.push({ key: 'about', href: '/about' })
  if (navigation.show_nav_books) items.push({ key: 'store', href: '/books' })
  if (navigation.show_nav_articles)
    items.push({ key: 'articles', href: '/articles' })
  if (navigation.show_nav_interviews)
    items.push({ key: 'interviews', href: '/interviews' })
  if (navigation.show_nav_events)
    items.push({ key: 'events', href: '/events' })
  if (navigation.show_nav_corporate)
    items.push({ key: 'corporate', href: '/corporate' })
  if (navigation.show_nav_booking)
    // Link directly to the first sub-route so the user skips the
    // /booking → /booking/tours 308 redirect roundtrip. Same destination,
    // one fewer hop, no analytics-marker query in the address bar.
    items.push({ key: 'booking', href: '/booking/tours' })
  if (navigation.show_nav_tests)
    items.push({ key: 'tests', href: '/tests' })
  if (navigation.show_nav_send_gift)
    items.push({ key: 'send_gift', href: '/gifts/send' })
  if (navigation.show_nav_contact)
    items.push({ key: 'contact', href: '/contact' })
  return items
}
