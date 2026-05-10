import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { AdminGiftsListPage } from '@/components/admin/gifts/AdminGiftsListPage'
import { getAdminGifts } from '@/lib/db/queries'
import type {
  GiftItemType,
  GiftSource,
  GiftStatus,
} from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    status?: string
    source?: string
    itemType?: string
    search?: string
    page?: string
  }>
}

const STATUS_VALUES: GiftStatus[] = [
  'PENDING',
  'CLAIMED',
  'EXPIRED',
  'REVOKED',
  'REFUNDED',
]
const SOURCE_VALUES: GiftSource[] = ['ADMIN_GRANT', 'USER_PURCHASE']
const ITEM_TYPE_VALUES: GiftItemType[] = ['BOOK', 'SESSION', 'BOOKING', 'TEST']

function readStatus(raw: string | undefined): GiftStatus | 'all' {
  if (raw && (STATUS_VALUES as string[]).includes(raw)) return raw as GiftStatus
  return 'all'
}
function readSource(raw: string | undefined): GiftSource | 'all' {
  if (raw && (SOURCE_VALUES as string[]).includes(raw)) return raw as GiftSource
  return 'all'
}
function readItemType(raw: string | undefined): GiftItemType | 'all' {
  if (raw && (ITEM_TYPE_VALUES as string[]).includes(raw)) return raw as GiftItemType
  return 'all'
}

export default async function AdminGiftsRoute({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.gifts.list')
  const sp = await searchParams

  const filter = {
    status: readStatus(sp.status),
    source: readSource(sp.source),
    itemType: readItemType(sp.itemType),
    search: (sp.search ?? '').trim() || undefined,
    page: Number.parseInt(sp.page ?? '1', 10) || 1,
    pageSize: 50,
  }
  const data = await getAdminGifts(filter)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg3">{t('subheading')}</p>
        <Link href="/admin/gifts/new" className="btn-pill btn-pill-primary">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('new_cta')}
        </Link>
      </div>
      <AdminGiftsListPage
        rows={data.rows.map((g) => ({
          id: g.id,
          source: g.source,
          status: g.status,
          itemType: g.itemType,
          recipientEmail: g.recipientEmail,
          amountCents: g.amountCents,
          currency: g.currency,
          createdAt: g.createdAt.toISOString(),
          expiresAt: g.expiresAt.toISOString(),
        }))}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        locale={locale === 'ar' ? 'ar' : 'en'}
        initialFilter={{
          status: filter.status,
          source: filter.source,
          itemType: filter.itemType,
          search: sp.search ?? '',
        }}
      />
    </div>
  )
}
