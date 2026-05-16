import { setRequestLocale } from 'next-intl/server'
import { Hero } from '@/components/sections/Hero'
import { AboutTeaser } from '@/components/sections/AboutTeaser'
import { StoreShowcase } from '@/components/sections/StoreShowcase'
import { ArticlesList } from '@/components/sections/ArticlesList'
import { InterviewRotator } from '@/components/sections/InterviewRotator'
import { Newsletter } from '@/components/sections/Newsletter'
import { getArticles, getBooks, getInterviews } from '@/lib/db/queries'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { resolvePublicUrl } from '@/lib/storage/public-url'

type Props = { params: Promise<{ locale: string }> }

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  // Phase G P1-1 — fan-out the root reads so they share the same RSC tick
  // instead of serializing ~5 round-trips. When the route renders statically
  // at build time this is purely a build-time win; when it falls through to
  // dynamic, it saves real per-request latency.
  //
  // BOOKs and SESSIONs are fetched as separate queries so neither type
  // starves the other in a shared limit budget. The "محاضرات مسجّلة"
  // section used to vanish when 10 BOOKs filled the unified 10-row response;
  // separate queries guarantee both surfaces get the rows they need.
  const [settings, articles, bookProducts, sessionProducts, interviews] = await Promise.all([
    getCachedSiteSettings(),
    getArticles({ limit: 6 }),
    getBooks({ limit: 10, productType: 'BOOK' }),
    getBooks({ limit: 6, productType: 'SESSION' }),
    getInterviews({ limit: 5 }),
  ])

  // StoreShowcase still expects a single mixed Book[] (it filters internally
  // by productType for the book shelf vs the lectures section). Merge the
  // two query results back into one array.
  const books = [...bookProducts, ...sessionProducts]

  // Phase F2 — resolve R2 storage keys to signed/passthrough URLs server-side
  // before handing to client section components. External URLs and local
  // /public paths pass through unchanged.
  const resolvedBooks = await Promise.all(
    books.map(async (book) => ({
      ...book,
      coverImage:
        (await resolvePublicUrl(book.coverImage)) ?? '/dr khaled photo.jpeg',
    })),
  )
  const resolvedArticles = await Promise.all(
    articles.map(async (article) => ({
      ...article,
      coverImage: (await resolvePublicUrl(article.coverImage)) ?? null,
    })),
  )
  // `thumbnailImage` is schema-NOT-NULL; fall back to the universal
  // placeholder (NOT the raw value — a raw R2 key crashes next/image).
  const resolvedInterviews = await Promise.all(
    interviews.map(async (interview) => ({
      ...interview,
      thumbnailImage:
        (await resolvePublicUrl(interview.thumbnailImage)) ?? '/dr khaled photo.jpeg',
    })),
  )

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
        <StoreShowcase books={resolvedBooks} featuredBookId={featured.featured_book_id} />
      )}
      {homepage.show_articles_list && (
        <ArticlesList
          articles={resolvedArticles}
          featuredArticleSlug={featured.featured_article_slug}
        />
      )}
      {homepage.show_interview_rotator && (
        <InterviewRotator
          interviews={resolvedInterviews}
          featuredInterviewId={featured.featured_interview_id}
        />
      )}
      {showNewsletter && <Newsletter />}
    </>
  )
}
