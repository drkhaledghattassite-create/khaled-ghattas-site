import type { SiteSettings } from './types'

/**
 * Default settings — used when no row exists in the DB, when DATABASE_URL is
 * unset (mock mode), and when an admin clicks "Reset to defaults".
 *
 * Phase 1 reveal posture: everything is visible by default. Admins flip
 * toggles off as content / pages are still being prepared.
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  homepage: {
    show_hero: true,
    show_about_teaser: true,
    show_store_showcase: true,
    show_articles_list: true,
    show_interview_rotator: true,
    show_newsletter: true,
  },
  navigation: {
    show_nav_books: true,
    show_nav_articles: true,
    show_nav_interviews: true,
    show_nav_events: true,
    show_nav_about: true,
    show_nav_contact: true,
    show_nav_corporate: true,
    show_nav_booking: true,
    show_nav_tests: true,
    // Default OFF — gifts are not promoted to casual visitors by default.
    // Admin flips this on once the surface is launched.
    show_nav_send_gift: false,
    show_locale_switcher: true,
  },
  footer: {
    show_footer_social: true,
    show_footer_brand: true,
    show_footer_quick_links: true,
    show_footer_colophon: true,
  },
  hero_ctas: {
    show_hero_cta_books: true,
    show_hero_cta_articles: true,
  },
  featured: {
    featured_book_id: null,
    featured_article_slug: null,
    featured_interview_id: null,
  },
  features: {
    // TEMP: flipped to true so Sign In / Sign Up render in the public nav
    // before any admin row exists in the DB. Revert to `false` once an
    // admin can log in and toggle it via /admin/settings/site.
    auth_enabled: true,
    newsletter_form_enabled: true,
    maintenance_mode: false,
  },
  maintenance: {
    message_ar: '',
    message_en: '',
    until: null,
  },
  admin: {
    show_admin_booking: true,
    show_admin_questions: true,
    show_admin_tests: true,
    show_admin_gifts: true,
  },
  dashboard: {
    show_account_tab: true,
    show_library_tab: true,
    show_bookings_tab: true,
    show_ask_tab: true,
    show_tests_tab: true,
    show_gifts_tab: true,
    show_settings_tab: true,
  },
  gifts: {
    allow_user_to_user: true,
  },
  coming_soon_pages: [],
}

/**
 * Deep-merge a partial settings update onto a base. Each top-level group is
 * merged independently so callers can patch a single toggle without
 * destroying sibling values. Arrays are replaced wholesale (not merged).
 */
export function mergeSettings(
  base: SiteSettings,
  patch: DeepPartial<SiteSettings>,
): SiteSettings {
  return {
    homepage: { ...base.homepage, ...patch.homepage, show_hero: true },
    navigation: { ...base.navigation, ...patch.navigation },
    footer: { ...base.footer, ...patch.footer },
    hero_ctas: { ...base.hero_ctas, ...patch.hero_ctas },
    featured: { ...base.featured, ...patch.featured },
    features: { ...base.features, ...patch.features },
    maintenance: { ...base.maintenance, ...patch.maintenance },
    admin: { ...base.admin, ...patch.admin },
    // Account tab is the /dashboard landing surface — same always-on
    // treatment as `show_hero`. Trailing override defends against a
    // patch that tries to set it false.
    dashboard: { ...base.dashboard, ...patch.dashboard, show_account_tab: true },
    gifts: { ...base.gifts, ...patch.gifts },
    coming_soon_pages: patch.coming_soon_pages ?? base.coming_soon_pages,
  }
}

/**
 * Coerce arbitrary JSON (e.g., a row from the DB) into a fully-typed
 * SiteSettings, filling in missing fields from DEFAULT_SETTINGS. Survives
 * shape drift between deploys.
 */
export function coerceSettings(input: unknown): SiteSettings {
  if (!input || typeof input !== 'object') return DEFAULT_SETTINGS
  return mergeSettings(DEFAULT_SETTINGS, input as DeepPartial<SiteSettings>)
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}
