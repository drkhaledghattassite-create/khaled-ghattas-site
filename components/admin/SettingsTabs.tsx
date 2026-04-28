'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { SiteSetting } from '@/lib/db/queries'

type Props = { settings: SiteSetting[] }

function lookup(rows: SiteSetting[], key: string): string {
  return rows.find((r) => r.key === key)?.value ?? ''
}

export function SettingsTabs({ settings }: Props) {
  const t = useTranslations('admin.settings')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')

  const [siteTitleAr, setSiteTitleAr] = useState(lookup(settings, 'site_title_ar'))
  const [siteTitleEn, setSiteTitleEn] = useState(lookup(settings, 'site_title_en'))
  const [siteDescriptionAr, setSiteDescriptionAr] = useState(
    lookup(settings, 'site_description_ar'),
  )
  const [siteDescriptionEn, setSiteDescriptionEn] = useState(
    lookup(settings, 'site_description_en'),
  )
  const [twitter, setTwitter] = useState(lookup(settings, 'twitter_url'))
  const [facebook, setFacebook] = useState(lookup(settings, 'facebook_url'))
  const [youtube, setYoutube] = useState(lookup(settings, 'youtube_url'))
  const [instagram, setInstagram] = useState(lookup(settings, 'instagram_url'))
  const [linkedin, setLinkedin] = useState(lookup(settings, 'linkedin_url'))
  const [defaultMetaImage, setDefaultMetaImage] = useState(lookup(settings, 'default_meta_image'))
  const [gaId, setGaId] = useState(lookup(settings, 'google_analytics_id'))
  const [robotsIndex, setRobotsIndex] = useState(true)
  const [fromName, setFromName] = useState('Dr. Khaled Ghattass')
  const [fromEmail, setFromEmail] = useState(lookup(settings, 'contact_email'))
  const [replyTo, setReplyTo] = useState(lookup(settings, 'contact_email'))
  const [currency, setCurrency] = useState('USD')
  const [taxRate, setTaxRate] = useState('0')
  const [maintenance, setMaintenance] = useState(false)

  async function save() {
    const payload: Record<string, string> = {
      site_title_ar: siteTitleAr,
      site_title_en: siteTitleEn,
      site_description_ar: siteDescriptionAr,
      site_description_en: siteDescriptionEn,
      twitter_url: twitter,
      facebook_url: facebook,
      youtube_url: youtube,
      instagram_url: instagram,
      linkedin_url: linkedin,
      default_meta_image: defaultMetaImage,
      google_analytics_id: gaId,
      robots_index: String(robotsIndex),
      from_name: fromName,
      from_email: fromEmail,
      reply_to_email: replyTo,
      currency,
      tax_rate: taxRate,
      maintenance_mode: String(maintenance),
    }
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_saved'))
    } catch (err) {
      console.error('[SettingsTabs/save]', err)
      toast.error(tActions('error_generic'))
    }
  }

  async function clearCache() {
    try {
      const res = await fetch('/api/admin/revalidate', { method: 'POST' })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('cache_cleared'))
    } catch (err) {
      console.error('[SettingsTabs/clearCache]', err)
      toast.error(tActions('error_generic'))
    }
  }

  const SaveBar = (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={save}
        className="font-label rounded-full border border-dashed border-fg1 bg-fg1 px-5 py-2 text-[12px] text-bg hover:bg-transparent hover:text-fg1"
      >
        {tForms('save')}
      </button>
    </div>
  )

  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList>
        <TabsTrigger value="general">{t('tabs.general')}</TabsTrigger>
        <TabsTrigger value="social">{t('tabs.social')}</TabsTrigger>
        <TabsTrigger value="seo">{t('tabs.seo')}</TabsTrigger>
        <TabsTrigger value="email">{t('tabs.email')}</TabsTrigger>
        <TabsTrigger value="payments">{t('tabs.payments')}</TabsTrigger>
        <TabsTrigger value="maintenance">{t('tabs.maintenance')}</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t('site_title_ar')}>
            <Input value={siteTitleAr} onChange={(e) => setSiteTitleAr(e.target.value)} dir="rtl" />
          </Field>
          <Field label={t('site_title_en')}>
            <Input value={siteTitleEn} onChange={(e) => setSiteTitleEn(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t('site_description_ar')}>
            <Textarea
              rows={3}
              value={siteDescriptionAr}
              onChange={(e) => setSiteDescriptionAr(e.target.value)}
              dir="rtl"
            />
          </Field>
          <Field label={t('site_description_en')}>
            <Textarea
              rows={3}
              value={siteDescriptionEn}
              onChange={(e) => setSiteDescriptionEn(e.target.value)}
            />
          </Field>
        </div>
        {SaveBar}
      </TabsContent>

      <TabsContent value="social" className="space-y-4">
        <Field label="Twitter / X URL">
          <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} />
        </Field>
        <Field label="Facebook URL">
          <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} />
        </Field>
        <Field label="YouTube URL">
          <Input value={youtube} onChange={(e) => setYoutube(e.target.value)} />
        </Field>
        <Field label="Instagram URL">
          <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} />
        </Field>
        <Field label="LinkedIn URL">
          <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
        </Field>
        {SaveBar}
      </TabsContent>

      <TabsContent value="seo" className="space-y-4">
        <Field label={t('default_meta_image')}>
          <Input
            value={defaultMetaImage}
            onChange={(e) => setDefaultMetaImage(e.target.value)}
          />
        </Field>
        <Field label="Google Analytics ID">
          <Input value={gaId} onChange={(e) => setGaId(e.target.value)} placeholder="G-…" />
        </Field>
        <div className="flex items-center gap-3 rounded border border-dashed border-border px-4 py-3">
          <Switch checked={robotsIndex} onCheckedChange={setRobotsIndex} id="robots" />
          <Label htmlFor="robots">{t('robots_indexing')}</Label>
        </div>
        {SaveBar}
      </TabsContent>

      <TabsContent value="email" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t('from_name')}>
            <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
          </Field>
          <Field label={t('from_email')}>
            <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
          </Field>
        </div>
        <Field label={t('reply_to_email')}>
          <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />
        </Field>
        <div className="rounded border border-dashed border-border px-4 py-3 text-[12px] text-fg3">
          {t('resend_status')}: <span className="text-fg1">{t('resend_ready')}</span>
        </div>
        {SaveBar}
      </TabsContent>

      <TabsContent value="payments" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Stripe public key">
            <Input value="pk_test_••••••••••••" readOnly className="font-mono text-[12px]" />
          </Field>
          <Field label="Stripe secret key">
            <Input value="sk_test_••••••••••••" readOnly className="font-mono text-[12px]" />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t('currency')}>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
          </Field>
          <Field label={t('tax_rate')}>
            <Input
              type="number"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </Field>
        </div>
        {SaveBar}
      </TabsContent>

      <TabsContent value="maintenance" className="space-y-4">
        <div className="flex items-center gap-3 rounded border border-dashed border-border px-4 py-3">
          <Switch checked={maintenance} onCheckedChange={setMaintenance} id="maintenance" />
          <Label htmlFor="maintenance">{t('maintenance_mode')}</Label>
        </div>
        <button
          type="button"
          onClick={clearCache}
          className="font-label inline-flex rounded-full border border-dashed border-accent/60 px-4 py-2 text-[12px] text-accent hover:bg-accent hover:text-accent-fg"
        >
          {t('clear_cache')}
        </button>
      </TabsContent>
    </Tabs>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-label text-[11px] text-fg3">{label}</Label>
      {children}
    </div>
  )
}
