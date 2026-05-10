import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { TestsCatalogPage } from '@/components/tests/TestsCatalogPage'
import {
  getPublishedTests,
  getTestIdsTakenByUser,
} from '@/lib/db/queries'
import { getServerSession } from '@/lib/auth/server'
import { pageMetadata } from '@/lib/seo/page-metadata'
import {
  TEST_CATEGORIES,
  type TestCategory,
} from '@/lib/validators/test'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string | string[] }>
}

// Auth-reading via getServerSession to detect taken state per card —
// must render per-request, never statically.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'tests.meta' })
  return pageMetadata({
    locale,
    path: '/tests',
    title: t('title'),
    description: t('description'),
  })
}

function readCategory(raw: string | string[] | undefined): TestCategory | 'all' {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return 'all'
  if ((TEST_CATEGORIES as readonly string[]).includes(value)) {
    return value as TestCategory
  }
  return 'all'
}

export default async function TestsCatalogRoute({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  // No coming-soon page key for /tests yet — Phase C2 may add one. The
  // navigation/visibility flag (`navigation.show_nav_tests`) hides the
  // link without blocking the route, mirroring how /booking and other
  // section landings handle phased reveal.
  const sp = await searchParams
  const category = readCategory(sp.category)

  const session = await getServerSession().catch(() => null)
  const tests = await getPublishedTests({
    category: category === 'all' ? undefined : category,
  }).catch((err) => {
    console.error('[tests/page] getPublishedTests', err)
    return []
  })

  const takenTestIds = session
    ? await getTestIdsTakenByUser(session.user.id).catch((err) => {
        console.error('[tests/page] getTestIdsTakenByUser', err)
        return new Set<string>()
      })
    : new Set<string>()

  const viewerLocale: 'ar' | 'en' = locale === 'ar' ? 'ar' : 'en'

  return (
    <TestsCatalogPage
      locale={viewerLocale}
      tests={tests}
      takenTestIds={Array.from(takenTestIds)}
      activeCategory={category}
    />
  )
}
