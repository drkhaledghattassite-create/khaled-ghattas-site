/**
 * Site-wide settings shape.
 *
 * Persisted as a single JSON object under the `site_config` row of the
 * `site_settings` table (in the `value_json` column). Read via
 * `getSiteSettings()`/`getCachedSiteSettings()`. Written via
 * `updateSiteSettings()` (admin-only, behind requireAdmin).
 *
 * Toggles control public-site visibility for phased reveal to Dr. Khaled.
 */

export const COMING_SOON_PAGES = [
  'books',
  'articles',
  'interviews',
  'events',
  'contact',
  'about',
] as const

export type ComingSoonPage = (typeof COMING_SOON_PAGES)[number]

export type SiteSettings = {
  homepage: {
    show_hero: true
    show_about_teaser: boolean
    show_store_showcase: boolean
    show_articles_list: boolean
    show_interview_rotator: boolean
    show_newsletter: boolean
  }
  navigation: {
    show_nav_books: boolean
    show_nav_articles: boolean
    show_nav_interviews: boolean
    show_nav_events: boolean
    show_nav_about: boolean
    show_nav_contact: boolean
    show_locale_switcher: boolean
  }
  footer: {
    show_footer_social: boolean
    show_footer_brand: boolean
    show_footer_quick_links: boolean
    show_footer_colophon: boolean
  }
  hero_ctas: {
    show_hero_cta_books: boolean
    show_hero_cta_articles: boolean
  }
  featured: {
    featured_book_id: string | null
    featured_article_slug: string | null
    featured_interview_id: string | null
  }
  features: {
    auth_enabled: boolean
    newsletter_form_enabled: boolean
    maintenance_mode: boolean
  }
  maintenance: {
    message_ar: string
    message_en: string
    until: string | null
  }
  coming_soon_pages: ComingSoonPage[]
}

/** Storage key used inside the `site_settings` table. */
export const SITE_CONFIG_KEY = 'site_config'

/** Unstable_cache tag — invalidated by updateSiteSettings(). */
export const SITE_SETTINGS_CACHE_TAG = 'site-settings'
