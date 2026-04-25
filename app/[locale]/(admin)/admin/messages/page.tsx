import { setRequestLocale } from 'next-intl/server'
import { MessagesInbox } from '@/components/admin/MessagesInbox'
import { getContactMessages } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminMessagesPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const messages = await getContactMessages(undefined, 200)
  return <MessagesInbox messages={messages} />
}
