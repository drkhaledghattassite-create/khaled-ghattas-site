import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'

export default async function NotFound() {
  const t = await getTranslations('not_found')

  return (
    <main
      id="main-content"
      className="relative flex min-h-screen items-center justify-center px-[var(--section-pad-x)] py-[var(--section-pad-y)]"
    >
      <div className="container mx-auto max-w-3xl text-center">
        <p className="section-eyebrow mx-auto mb-8 justify-center">{t('eyebrow')}</p>

        <p
          aria-hidden
          className="font-arabic-display select-none text-[clamp(120px,28vw,300px)] leading-none tracking-tight text-fg1/95"
        >
          404
        </p>

        <h1 className="section-title mt-6">{t('heading')}</h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-fg2 leading-relaxed">
          {t('description')}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-pill btn-pill-primary">
            {t('back_home')}
          </Link>
          <Link href="/contact" className="btn-pill btn-pill-secondary">
            {t('contact')}
          </Link>
        </div>
      </div>
    </main>
  )
}
