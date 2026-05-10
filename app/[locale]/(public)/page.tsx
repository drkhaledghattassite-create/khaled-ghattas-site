import { setRequestLocale } from 'next-intl/server'
import { Hero } from '@/components/sections/Hero'
import { AboutTeaser } from '@/components/sections/AboutTeaser'
import { StoreShowcase } from '@/components/sections/StoreShowcase'
import { ArticlesList } from '@/components/sections/ArticlesList'
import { InterviewRotator } from '@/components/sections/InterviewRotator'
import { Newsletter } from '@/components/sections/Newsletter'
import { getArticles, getBooks, getInterviews } from '@/lib/db/queries'
import { getCachedSiteSettings } from '@/lib/site-settings/get'

type Props = { params: Promise<{ locale: string }> }

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const settings = await getCachedSiteSettings()
  const articles = await getArticles({ limit: 6 })
  const books = await getBooks({ limit: 10 })
  const interviews = await getInterviews({ limit: 5 })

  const { homepage, hero_ctas, featured, features } = settings
  const showNewsletter = homepage.show_newsletter && features.newsletter_form_enabled

  return (
    <>
      {/* Phase A3.2 — WelcomeBackBanner unmounted. Continue-content
          affordances live on tab-specific surfaces in the dashboard
          (/dashboard/library, /dashboard/bookings) — the public homepage
          showing them duplicated those surfaces for logged-in visitors.
          Component file kept on disk for potential future use. */}
      <Hero
        showCtaBooks={hero_ctas.show_hero_cta_books}
        showCtaArticles={hero_ctas.show_hero_cta_articles}
      />
      {homepage.show_about_teaser && <AboutTeaser />}
      {homepage.show_store_showcase && (
        <StoreShowcase books={books} featuredBookId={featured.featured_book_id} />
      )}
      {homepage.show_articles_list && (
        <ArticlesList
          articles={articles}
          featuredArticleSlug={featured.featured_article_slug}
        />
      )}
      {homepage.show_interview_rotator && (
        <InterviewRotator
          interviews={interviews}
          featuredInterviewId={featured.featured_interview_id}
        />
      )}
      {showNewsletter && <Newsletter />}
    </>
  )
}
