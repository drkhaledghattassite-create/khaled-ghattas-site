import { z } from 'zod'
import { COMING_SOON_PAGES } from './types'

/**
 * Validation schema for the SiteSettings PATCH body. Every group is optional
 * so callers can submit a partial update; the API merges with current values.
 */

const homepageSchema = z
  .object({
    show_hero: z.literal(true).optional(),
    show_about_teaser: z.boolean().optional(),
    show_store_showcase: z.boolean().optional(),
    show_articles_list: z.boolean().optional(),
    show_interview_rotator: z.boolean().optional(),
    show_newsletter: z.boolean().optional(),
  })
  .strict()

const navigationSchema = z
  .object({
    show_nav_books: z.boolean().optional(),
    show_nav_articles: z.boolean().optional(),
    show_nav_interviews: z.boolean().optional(),
    show_nav_events: z.boolean().optional(),
    show_nav_about: z.boolean().optional(),
    show_nav_contact: z.boolean().optional(),
    show_nav_corporate: z.boolean().optional(),
    show_nav_booking: z.boolean().optional(),
    show_nav_tests: z.boolean().optional(),
    show_nav_send_gift: z.boolean().optional(),
    show_locale_switcher: z.boolean().optional(),
  })
  .strict()

const footerSchema = z
  .object({
    show_footer_social: z.boolean().optional(),
    show_footer_brand: z.boolean().optional(),
    show_footer_quick_links: z.boolean().optional(),
    show_footer_colophon: z.boolean().optional(),
  })
  .strict()

const heroCtasSchema = z
  .object({
    show_hero_cta_books: z.boolean().optional(),
    show_hero_cta_articles: z.boolean().optional(),
  })
  .strict()

const featuredSchema = z
  .object({
    featured_book_id: z.string().max(64).nullable().optional(),
    featured_article_slug: z.string().max(120).nullable().optional(),
    featured_interview_id: z.string().max(64).nullable().optional(),
  })
  .strict()

const featuresSchema = z
  .object({
    auth_enabled: z.boolean().optional(),
    newsletter_form_enabled: z.boolean().optional(),
    maintenance_mode: z.boolean().optional(),
  })
  .strict()

const maintenanceSchema = z
  .object({
    message_ar: z.string().max(200).optional(),
    message_en: z.string().max(200).optional(),
    until: z.string().max(40).nullable().optional(),
  })
  .strict()

const adminSchema = z
  .object({
    show_admin_booking: z.boolean().optional(),
    show_admin_questions: z.boolean().optional(),
    show_admin_tests: z.boolean().optional(),
    show_admin_gifts: z.boolean().optional(),
    show_admin_email_queue: z.boolean().optional(),
  })
  .strict()

const dashboardSchema = z
  .object({
    // Always-on like homepage.show_hero — accepts only `true` from a
    // patch payload. Defends against a malicious or buggy patch attempting
    // to hide the dashboard's landing surface.
    show_account_tab: z.literal(true).optional(),
    show_library_tab: z.boolean().optional(),
    show_bookings_tab: z.boolean().optional(),
    show_ask_tab: z.boolean().optional(),
    show_tests_tab: z.boolean().optional(),
    show_gifts_tab: z.boolean().optional(),
    show_settings_tab: z.boolean().optional(),
  })
  .strict()

const giftsSchema = z
  .object({
    allow_user_to_user: z.boolean().optional(),
  })
  .strict()

const comingSoonPagesSchema = z
  .array(z.enum(COMING_SOON_PAGES))
  .max(COMING_SOON_PAGES.length)

export const siteSettingsPatchSchema = z
  .object({
    homepage: homepageSchema.optional(),
    navigation: navigationSchema.optional(),
    footer: footerSchema.optional(),
    hero_ctas: heroCtasSchema.optional(),
    featured: featuredSchema.optional(),
    features: featuresSchema.optional(),
    maintenance: maintenanceSchema.optional(),
    admin: adminSchema.optional(),
    dashboard: dashboardSchema.optional(),
    gifts: giftsSchema.optional(),
    coming_soon_pages: comingSoonPagesSchema.optional(),
  })
  .strict()

export type SiteSettingsPatch = z.infer<typeof siteSettingsPatchSchema>
