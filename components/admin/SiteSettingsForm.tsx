'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { RotateCcw, Save } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { DEFAULT_SETTINGS } from '@/lib/site-settings/defaults'
import {
  COMING_SOON_PAGES,
  type ComingSoonPage,
  type SiteSettings,
} from '@/lib/site-settings/types'

type Props = {
  locale: string
  initialSettings: SiteSettings
  bookOptions: Array<{ id: string; titleAr: string; titleEn: string }>
  articleOptions: Array<{ slug: string; titleAr: string; titleEn: string }>
  interviewOptions: Array<{ id: string; titleAr: string; titleEn: string }>
}

const NONE = '__none__'

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function SiteSettingsForm({
  locale,
  initialSettings,
  bookOptions,
  articleOptions,
  interviewOptions,
}: Props) {
  const t = useTranslations('admin.site_settings')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const isAr = locale === 'ar'

  const [settings, setSettings] = useState<SiteSettings>(initialSettings)
  const [savedSettings, setSavedSettings] = useState<SiteSettings>(initialSettings)
  const [submitting, setSubmitting] = useState(false)

  const dirty = useMemo(
    () => !deepEqual(settings, savedSettings),
    [settings, savedSettings],
  )

  function update<K extends keyof SiteSettings>(
    group: K,
    patch: Partial<SiteSettings[K]>,
  ) {
    setSettings((prev) => ({
      ...prev,
      [group]: { ...prev[group], ...patch },
    }))
  }

  function setComingSoon(page: ComingSoonPage, included: boolean) {
    setSettings((prev) => {
      const set = new Set<ComingSoonPage>(prev.coming_soon_pages)
      if (included) set.add(page)
      else set.delete(page)
      return { ...prev, coming_soon_pages: Array.from(set) }
    })
  }

  async function save() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      const json = (await res.json()) as { ok: boolean; data?: SiteSettings }
      if (json.data) {
        setSettings(json.data)
        setSavedSettings(json.data)
      } else {
        setSavedSettings(settings)
      }
      toast.success(tActions('success_saved'))
    } catch (err) {
      console.error('[SiteSettingsForm/save]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  async function reset() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(DEFAULT_SETTINGS),
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      const json = (await res.json()) as { ok: boolean; data?: SiteSettings }
      const next = json.data ?? DEFAULT_SETTINGS
      setSettings(next)
      setSavedSettings(next)
      toast.success(tActions('success_saved'))
    } catch (err) {
      console.error('[SiteSettingsForm/reset]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  function optionLabel(opt: { titleAr: string; titleEn: string }) {
    return isAr ? opt.titleAr : opt.titleEn
  }

  return (
    <div className="space-y-6 pb-32">
      <header>
        <h1
          className={`m-0 text-[clamp(22px,2.4vw,28px)] font-bold tracking-[-0.005em] text-fg1 ${
            isAr ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.02em]'
          }`}
        >
          {t('title')}
        </h1>
        <p
          className={`mt-2 max-w-[64ch] text-[14px] leading-[1.6] text-fg3 ${
            isAr ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('subtitle')}
        </p>
      </header>

      <Card title={t('groups.homepage_title')} description={t('groups.homepage_desc')}>
        <div className="grid gap-3 md:grid-cols-2">
          <ToggleRow
            label={t('homepage.show_hero')}
            description={t('homepage.show_hero_desc')}
            checked
            disabled
          />
          <ToggleRow
            label={t('homepage.show_about_teaser')}
            checked={settings.homepage.show_about_teaser}
            onCheckedChange={(v) => update('homepage', { show_about_teaser: v })}
          />
          <ToggleRow
            label={t('homepage.show_store_showcase')}
            checked={settings.homepage.show_store_showcase}
            onCheckedChange={(v) => update('homepage', { show_store_showcase: v })}
          />
          <ToggleRow
            label={t('homepage.show_articles_list')}
            checked={settings.homepage.show_articles_list}
            onCheckedChange={(v) => update('homepage', { show_articles_list: v })}
          />
          <ToggleRow
            label={t('homepage.show_interview_rotator')}
            checked={settings.homepage.show_interview_rotator}
            onCheckedChange={(v) => update('homepage', { show_interview_rotator: v })}
          />
          <ToggleRow
            label={t('homepage.show_newsletter')}
            checked={settings.homepage.show_newsletter}
            onCheckedChange={(v) => update('homepage', { show_newsletter: v })}
          />
        </div>
      </Card>

      <Card title={t('groups.navigation_title')} description={t('groups.navigation_desc')}>
        <div className="grid gap-3 md:grid-cols-2">
          <ToggleRow
            label={t('navigation.show_nav_books')}
            checked={settings.navigation.show_nav_books}
            onCheckedChange={(v) => update('navigation', { show_nav_books: v })}
          />
          <ToggleRow
            label={t('navigation.show_nav_articles')}
            checked={settings.navigation.show_nav_articles}
            onCheckedChange={(v) => update('navigation', { show_nav_articles: v })}
          />
          <ToggleRow
            label={t('navigation.show_nav_interviews')}
            checked={settings.navigation.show_nav_interviews}
            onCheckedChange={(v) => update('navigation', { show_nav_interviews: v })}
          />
          <ToggleRow
            label={t('navigation.show_nav_events')}
            checked={settings.navigation.show_nav_events}
            onCheckedChange={(v) => update('navigation', { show_nav_events: v })}
          />
          <ToggleRow
            label={t('navigation.show_nav_about')}
            checked={settings.navigation.show_nav_about}
            onCheckedChange={(v) => update('navigation', { show_nav_about: v })}
          />
          <ToggleRow
            label={t('navigation.show_nav_contact')}
            checked={settings.navigation.show_nav_contact}
            onCheckedChange={(v) => update('navigation', { show_nav_contact: v })}
          />
          <ToggleRow
            label={t('navigation.show_nav_corporate')}
            checked={settings.navigation.show_nav_corporate}
            onCheckedChange={(v) => update('navigation', { show_nav_corporate: v })}
          />
          <ToggleRow
            label={t('navigation.show_nav_booking')}
            checked={settings.navigation.show_nav_booking}
            onCheckedChange={(v) => update('navigation', { show_nav_booking: v })}
          />
          <ToggleRow
            label={t('navigation.show_nav_tests')}
            checked={settings.navigation.show_nav_tests}
            onCheckedChange={(v) => update('navigation', { show_nav_tests: v })}
          />
          <ToggleRow
            label={t('navigation.show_locale_switcher')}
            checked={settings.navigation.show_locale_switcher}
            onCheckedChange={(v) => update('navigation', { show_locale_switcher: v })}
          />
        </div>
        <p className={`mt-3 text-[12px] text-fg3 ${isAr ? 'font-arabic-body' : 'font-display'}`}>
          {t('navigation.bottom_nav_note')}
        </p>
      </Card>

      <Card title={t('groups.footer_title')} description={t('groups.footer_desc')}>
        <div className="grid gap-3 md:grid-cols-2">
          <ToggleRow
            label={t('footer.show_footer_social')}
            checked={settings.footer.show_footer_social}
            onCheckedChange={(v) => update('footer', { show_footer_social: v })}
          />
          <ToggleRow
            label={t('footer.show_footer_brand')}
            description={t('footer.show_footer_brand_desc')}
            checked={settings.footer.show_footer_brand}
            onCheckedChange={(v) => update('footer', { show_footer_brand: v })}
          />
          <ToggleRow
            label={t('footer.show_footer_quick_links')}
            checked={settings.footer.show_footer_quick_links}
            onCheckedChange={(v) => update('footer', { show_footer_quick_links: v })}
          />
          <ToggleRow
            label={t('footer.show_footer_colophon')}
            checked={settings.footer.show_footer_colophon}
            onCheckedChange={(v) => update('footer', { show_footer_colophon: v })}
          />
        </div>
      </Card>

      <Card title={t('groups.hero_ctas_title')} description={t('groups.hero_ctas_desc')}>
        <div className="grid gap-3 md:grid-cols-2">
          <ToggleRow
            label={t('hero_ctas.show_hero_cta_books')}
            checked={settings.hero_ctas.show_hero_cta_books}
            onCheckedChange={(v) => update('hero_ctas', { show_hero_cta_books: v })}
          />
          <ToggleRow
            label={t('hero_ctas.show_hero_cta_articles')}
            checked={settings.hero_ctas.show_hero_cta_articles}
            onCheckedChange={(v) => update('hero_ctas', { show_hero_cta_articles: v })}
          />
        </div>
      </Card>

      <Card title={t('groups.featured_title')} description={t('groups.featured_desc')}>
        <div className="grid gap-5">
          <FieldRow label={t('featured.featured_book_id')} hint={t('featured.default_hint')}>
            <Select
              value={settings.featured.featured_book_id ?? NONE}
              onValueChange={(v) =>
                update('featured', { featured_book_id: v === NONE ? null : v })
              }
            >
              <SelectTrigger className="w-full max-w-[420px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t('featured.default_option')}</SelectItem>
                {bookOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {optionLabel(b)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label={t('featured.featured_article_slug')} hint={t('featured.default_hint')}>
            <Select
              value={settings.featured.featured_article_slug ?? NONE}
              onValueChange={(v) =>
                update('featured', { featured_article_slug: v === NONE ? null : v })
              }
            >
              <SelectTrigger className="w-full max-w-[420px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t('featured.default_option')}</SelectItem>
                {articleOptions.map((a) => (
                  <SelectItem key={a.slug} value={a.slug}>
                    {optionLabel(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label={t('featured.featured_interview_id')} hint={t('featured.default_hint')}>
            <Select
              value={settings.featured.featured_interview_id ?? NONE}
              onValueChange={(v) =>
                update('featured', { featured_interview_id: v === NONE ? null : v })
              }
            >
              <SelectTrigger className="w-full max-w-[420px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t('featured.default_option')}</SelectItem>
                {interviewOptions.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {optionLabel(i)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </div>
      </Card>

      <Card title={t('groups.features_title')} description={t('groups.features_desc')}>
        <div className="grid gap-3 md:grid-cols-2">
          <ToggleRow
            label={t('features.auth_enabled')}
            description={t('features.auth_enabled_desc')}
            checked={settings.features.auth_enabled}
            onCheckedChange={(v) => update('features', { auth_enabled: v })}
          />
          <ToggleRow
            label={t('features.newsletter_form_enabled')}
            description={t('features.newsletter_form_enabled_desc')}
            checked={settings.features.newsletter_form_enabled}
            onCheckedChange={(v) => update('features', { newsletter_form_enabled: v })}
          />
          <ToggleRow
            label={t('features.maintenance_mode')}
            description={t('features.maintenance_mode_desc')}
            checked={settings.features.maintenance_mode}
            onCheckedChange={(v) => update('features', { maintenance_mode: v })}
          />
        </div>
      </Card>

      <Card title={t('groups.admin_title')} description={t('groups.admin_desc')}>
        <div className="grid gap-3 md:grid-cols-2">
          <ToggleRow
            label={t('admin.show_admin_booking')}
            description={t('admin.show_admin_booking_desc')}
            checked={settings.admin.show_admin_booking}
            onCheckedChange={(v) => update('admin', { show_admin_booking: v })}
          />
          <ToggleRow
            label={t('admin.show_admin_questions')}
            description={t('admin.show_admin_questions_desc')}
            checked={settings.admin.show_admin_questions}
            onCheckedChange={(v) => update('admin', { show_admin_questions: v })}
          />
          <ToggleRow
            label={t('admin.show_admin_tests')}
            description={t('admin.show_admin_tests_desc')}
            checked={settings.admin.show_admin_tests}
            onCheckedChange={(v) => update('admin', { show_admin_tests: v })}
          />
          <ToggleRow
            label={t('admin.show_admin_gifts')}
            description={t('admin.show_admin_gifts_desc')}
            checked={settings.admin.show_admin_gifts}
            onCheckedChange={(v) => update('admin', { show_admin_gifts: v })}
          />
          <ToggleRow
            label={t('admin.show_admin_email_queue')}
            description={t('admin.show_admin_email_queue_desc')}
            checked={settings.admin.show_admin_email_queue}
            onCheckedChange={(v) => update('admin', { show_admin_email_queue: v })}
          />
        </div>
      </Card>

      <Card title={t('groups.dashboard_title')} description={t('groups.dashboard_desc')}>
        <div className="grid gap-3 md:grid-cols-2">
          <ToggleRow
            label={t('dashboard.show_account_tab')}
            description={t('dashboard.show_account_tab_desc')}
            checked
            disabled
          />
          <ToggleRow
            label={t('dashboard.show_library_tab')}
            description={t('dashboard.show_library_tab_desc')}
            checked={settings.dashboard.show_library_tab}
            onCheckedChange={(v) => update('dashboard', { show_library_tab: v })}
          />
          <ToggleRow
            label={t('dashboard.show_bookings_tab')}
            description={t('dashboard.show_bookings_tab_desc')}
            checked={settings.dashboard.show_bookings_tab}
            onCheckedChange={(v) => update('dashboard', { show_bookings_tab: v })}
          />
          <ToggleRow
            label={t('dashboard.show_ask_tab')}
            description={t('dashboard.show_ask_tab_desc')}
            checked={settings.dashboard.show_ask_tab}
            onCheckedChange={(v) => update('dashboard', { show_ask_tab: v })}
          />
          <ToggleRow
            label={t('dashboard.show_tests_tab')}
            description={t('dashboard.show_tests_tab_desc')}
            checked={settings.dashboard.show_tests_tab}
            onCheckedChange={(v) => update('dashboard', { show_tests_tab: v })}
          />
          <ToggleRow
            label={t('dashboard.show_gifts_tab')}
            description={t('dashboard.show_gifts_tab_desc')}
            checked={settings.dashboard.show_gifts_tab}
            onCheckedChange={(v) => update('dashboard', { show_gifts_tab: v })}
          />
          <ToggleRow
            label={t('dashboard.show_settings_tab')}
            description={t('dashboard.show_settings_tab_desc')}
            checked={settings.dashboard.show_settings_tab}
            onCheckedChange={(v) => update('dashboard', { show_settings_tab: v })}
          />
        </div>
      </Card>

      <Card title={t('groups.gifts_title')} description={t('groups.gifts_desc')}>
        <div className="grid gap-3">
          <ToggleRow
            label={t('gifts.allow_user_to_user')}
            description={t('gifts.allow_user_to_user_desc')}
            checked={settings.gifts.allow_user_to_user}
            onCheckedChange={(v) => update('gifts', { allow_user_to_user: v })}
          />
          <ToggleRow
            label={t('navigation.show_nav_send_gift')}
            description={t('navigation.show_nav_send_gift_desc')}
            checked={settings.navigation.show_nav_send_gift}
            onCheckedChange={(v) => update('navigation', { show_nav_send_gift: v })}
          />
        </div>
      </Card>

      {settings.features.maintenance_mode && (
        <Card title={t('groups.maintenance_title')} description={t('groups.maintenance_desc')}>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldRow label={t('maintenance.message_ar')}>
              <Input
                value={settings.maintenance.message_ar}
                onChange={(e) => update('maintenance', { message_ar: e.target.value })}
                dir="rtl"
                maxLength={200}
                placeholder={t('maintenance.placeholder_ar')}
              />
            </FieldRow>
            <FieldRow label={t('maintenance.message_en')}>
              <Input
                value={settings.maintenance.message_en}
                onChange={(e) => update('maintenance', { message_en: e.target.value })}
                maxLength={200}
                placeholder={t('maintenance.placeholder_en')}
              />
            </FieldRow>
          </div>
          <FieldRow label={t('maintenance.until')} hint={t('maintenance.until_hint')}>
            <Input
              type="date"
              value={settings.maintenance.until ?? ''}
              onChange={(e) =>
                update('maintenance', { until: e.target.value || null })
              }
              className="max-w-[260px]"
            />
          </FieldRow>
        </Card>
      )}

      <Card title={t('groups.coming_soon_title')} description={t('groups.coming_soon_desc')}>
        <ul className="grid gap-2 md:grid-cols-2">
          {COMING_SOON_PAGES.map((page) => (
            <li
              key={page}
              className="flex items-start gap-2.5 rounded-md border border-border bg-bg-elevated px-4 py-3"
            >
              <Checkbox
                id={`cs-${page}`}
                checked={settings.coming_soon_pages.includes(page)}
                onCheckedChange={(v) => setComingSoon(page, v === true)}
              />
              <Label
                htmlFor={`cs-${page}`}
                className={`leading-tight ${isAr ? 'font-arabic-body' : 'font-display'}`}
              >
                <span className="block text-[13px] font-semibold text-fg1">
                  {t(`coming_soon.${page}`)}
                </span>
                <span className="block text-[12px] text-fg3 mt-0.5">
                  /{page}
                </span>
              </Label>
            </li>
          ))}
        </ul>
      </Card>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 z-30 mx-auto flex w-full max-w-[var(--container-max)] items-center justify-end gap-3 rounded-full border border-border bg-bg-elevated/95 px-4 py-2.5 shadow-[var(--shadow-card)] backdrop-blur">
        {dirty && (
          <span
            className={`me-auto text-[12px] font-semibold uppercase tracking-[0.08em] text-accent ${
              isAr ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
            }`}
          >
            {t('unsaved_changes')}
          </span>
        )}

        <AlertDialog>
          <AlertDialogTrigger
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-fg2 transition-colors hover:bg-bg-deep hover:text-fg1 disabled:opacity-60 font-display"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {t('reset')}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('reset_confirm_title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('reset_confirm_body')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tForms('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={reset}>{t('reset')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <button
          type="button"
          onClick={save}
          disabled={submitting || !dirty}
          className="inline-flex items-center gap-1.5 rounded-full border border-fg1 bg-fg1 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-bg transition-colors hover:bg-accent hover:border-accent hover:text-accent-fg disabled:opacity-60 font-display"
        >
          <Save className="h-3.5 w-3.5" aria-hidden />
          {submitting ? tForms('saving') : tForms('save')}
        </button>
      </div>
    </div>
  )
}

function Card({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-md border border-border bg-bg-elevated p-5 md:p-6">
      <header className="mb-5">
        <h2 className="m-0 text-[15px] font-semibold tracking-[-0.005em] text-fg1 font-display">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-[64ch] text-[13px] leading-[1.55] text-fg3 font-display">
            {description}
          </p>
        )}
      </header>
      {children}
    </section>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onCheckedChange?: (v: boolean) => void
}) {
  return (
    <label
      className={`flex items-start justify-between gap-4 rounded-md border border-border bg-bg px-4 py-3 transition-colors ${
        disabled ? 'opacity-60' : 'hover:bg-bg-deep'
      }`}
    >
      <span className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-fg1 font-display">
          {label}
        </span>
        {description && (
          <span className="text-[12px] leading-[1.5] text-fg3 font-display">
            {description}
          </span>
        )}
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </label>
  )
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-fg3 font-display">
        {label}
      </Label>
      {children}
      {hint && (
        <span className="text-[11.5px] text-fg3 font-display">{hint}</span>
      )}
    </div>
  )
}
