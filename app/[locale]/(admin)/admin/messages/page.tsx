import { setRequestLocale } from 'next-intl/server'
import { MessagesInbox } from '@/components/admin/MessagesInbox'
import { getContactMessages } from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminMessagesPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const messages = await getContactMessages(undefined, 200)
  return <MessagesInbox messages={messages} />
}
