import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { LoginForm } from '@/components/auth/LoginForm'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth.login.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <LoginForm />
}
