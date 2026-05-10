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
  'corporate',
  'booking',
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
    show_nav_corporate: boolean
    show_nav_booking: boolean
    /**
     * Phase C1 — when false, the public-site "Tests" link is hidden from
     * the header nav and footer. Mirrors `show_nav_booking`'s pattern: a
     * section-scoped visibility toggle that does NOT block the route.
     */
    show_nav_tests: boolean
    /**
     * Phase D — when true, the public "Send a gift" link surfaces in the
     * header nav and footer. Default OFF so gifting isn't promoted to
     * casual visitors before Dr. Khaled flips it on. The /gifts/send route
     * stays accessible regardless (deep link preserved).
     */
    show_nav_send_gift: boolean
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
  admin: {
    /**
     * When false, the booking admin section is hidden from the sidebar.
     * Useful when Dr. Khaled wants the public /booking page suspended
     * (via coming_soon_pages) AND wants the operator UI hidden too.
     */
    show_admin_booking: boolean
    /**
     * Phase B2 — when false, the "Questions" admin sidebar entry is
     * hidden. The /admin/questions route still resolves via deep link.
     * Mirrors `show_admin_booking`'s pattern: a section-scoped toggle.
     */
    show_admin_questions: boolean
    /**
     * Phase C2 — when false, the "Tests" admin sidebar entry is hidden.
     * The /admin/tests route still resolves via deep link. Same scoped-
     * toggle pattern as the other show_admin_* flags.
     */
    show_admin_tests: boolean
    /**
     * Phase D — when false, the "Gifts" admin sidebar entry is hidden.
     * The /admin/gifts route still resolves via deep link.
     */
    show_admin_gifts: boolean
    /**
     * Phase D2 — when false, the "Email queue" admin sidebar entry is
     * hidden. The /admin/email-queue route still resolves via deep link.
     * Defaults true — operators need visibility into delivery failures
     * for the queue to actually be useful.
     */
    show_admin_email_queue: boolean
  }
  dashboard: {
    /**
     * Per-tab visibility for the customer dashboard nav. Each toggle hides
     * the tab from the sticky tab bar but DOES NOT block the route — the
     * page is still reachable via direct URL, by design (mirrors the
     * `admin.show_admin_booking` pattern).
     *
     * `show_account_tab` is a literal-true (always-on) — same pattern as
     * `homepage.show_hero`. The Account tab IS the /dashboard landing
     * surface (profile editor); hiding it leaves users without a path
     * back to their own info from sister tabs. The form renders it as
     * disabled+checked; mergeSettings forces it true even if a patch
     * tries to flip it.
     */
    show_account_tab: true
    show_library_tab: boolean
    show_bookings_tab: boolean
    show_ask_tab: boolean
    /**
     * Phase C1 — when false, the dashboard "Tests" tab is hidden from
     * the sticky tab bar. Same pattern as `show_ask_tab`: hides the tab
     * but does NOT block the route — `/dashboard/tests` still resolves
     * via deep link.
     */
    show_tests_tab: boolean
    /**
     * Phase D — when false, the dashboard "Gifts" tab is hidden from the
     * sticky tab bar. Same pattern as `show_tests_tab`: hides the tab but
     * does NOT block the route — `/dashboard/gifts` still resolves via
     * deep link.
     */
    show_gifts_tab: boolean
    show_settings_tab: boolean
  }
  maintenance: {
    message_ar: string
    message_en: string
    until: string | null
  }
  /**
   * Phase D — gift feature kill-switch + sub-toggles. `allow_user_to_user`
   * is the master switch for /gifts/send (sender-initiated paid gifts);
   * when false, the public form hides the submit CTA and the action
   * returns 'feature_disabled' defensively. Admin grants are always
   * available via /admin/gifts/new (no kill switch by design).
   */
  gifts: {
    allow_user_to_user: boolean
  }
  coming_soon_pages: ComingSoonPage[]
}

/** Storage key used inside the `site_settings` table. */
export const SITE_CONFIG_KEY = 'site_config'

/** Unstable_cache tag — invalidated by updateSiteSettings(). */
export const SITE_SETTINGS_CACHE_TAG = 'site-settings'
