'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  corporateRequestSchema,
  type CorporateRequestInput,
} from '@/lib/validators/corporate'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CorporateProgram } from '@/lib/db/queries'

type Props = {
  programs: CorporateProgram[]
}

const inputClass =
  'h-12 rounded-md border border-border bg-bg-elevated px-3 text-[16px] text-fg1 placeholder:text-fg3/70 focus-visible:border-accent focus-visible:ring-0'

const textareaClass =
  'rounded-md border border-border bg-bg-elevated px-3 py-3 text-[16px] text-fg1 placeholder:text-fg3/70 focus-visible:border-accent focus-visible:ring-0'

const ANY_PROGRAM = '__any__'

const DEFAULTS: CorporateRequestInput = {
  name: '',
  email: '',
  phone: '',
  organization: '',
  position: '',
  programId: '',
  preferredDate: '',
  attendeeCount: null,
  message: '',
}

export function CorporateRequestForm({ programs }: Props) {
  const t = useTranslations('corporate.form')
  const tProgs = useTranslations('corporate.programs')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [submitting, setSubmitting] = useState(false)
  const programSelectRef = useRef<HTMLFieldSetElement>(null)

  const form = useForm<CorporateRequestInput>({
    resolver: zodResolver(corporateRequestSchema),
    defaultValues: DEFAULTS,
  })

  // Listen for the side-channel event from CorporateProgramsGrid so a card
  // CTA prefills the program select. Lower coupling than threading a ref.
  useEffect(() => {
    function onSelect(e: Event) {
      const detail = (e as CustomEvent<{ programId: string }>).detail
      if (!detail?.programId) return
      form.setValue('programId', detail.programId, { shouldDirty: true })
      // Smooth scroll the select into view so the user sees the prefill.
      window.setTimeout(() => {
        programSelectRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 200)
    }
    window.addEventListener('kg:corporate:select-program', onSelect)
    return () =>
      window.removeEventListener('kg:corporate:select-program', onSelect)
  }, [form])

  async function onSubmit(values: CorporateRequestInput) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/corporate/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (res.ok) {
        toast.success(t('submitted'))
        form.reset(DEFAULTS)
        return
      }
      if (res.status === 429) {
        toast.error(t('error_rate_limited'))
        return
      }
      if (res.status === 400) {
        toast.error(t('error_validation'))
        return
      }
      toast.error(t('error_generic'))
    } catch (err) {
      console.error('[CorporateRequestForm]', err)
      toast.error(t('error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-8"
        noValidate
      >
        <fieldset className="flex flex-col gap-5 m-0 p-0 border-0">
          <legend
            className={`section-eyebrow !text-fg3 mb-1 ${
              isRtl ? '!text-[13px]' : ''
            }`}
          >
            {t('section_contact')}
          </legend>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('name_placeholder')}
                      className={inputClass}
                      autoComplete="name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('email')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      inputMode="email"
                      placeholder={t('email_placeholder')}
                      className={inputClass}
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('phone')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      type="tel"
                      inputMode="tel"
                      placeholder={t('phone_placeholder')}
                      className={inputClass}
                      autoComplete="tel"
                      dir="ltr"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('position')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder={t('position_placeholder')}
                      className={inputClass}
                      autoComplete="organization-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-5 m-0 p-0 border-0">
          <legend className="section-eyebrow !text-fg3 mb-1">
            {t('section_organization')}
          </legend>
          <FormField
            control={form.control}
            name="organization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('organization')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('organization_placeholder')}
                    className={inputClass}
                    autoComplete="organization"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        <fieldset
          className="flex flex-col gap-5 m-0 p-0 border-0"
          ref={programSelectRef}
        >
          <legend className="section-eyebrow !text-fg3 mb-1">
            {t('section_program')}
          </legend>
          <FormField
            control={form.control}
            name="programId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('program')}</FormLabel>
                <Select
                  value={field.value && field.value.length > 0 ? field.value : ANY_PROGRAM}
                  onValueChange={(v) =>
                    field.onChange(v === ANY_PROGRAM ? '' : v)
                  }
                >
                  <FormControl>
                    <SelectTrigger className="h-12 bg-bg-elevated">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={ANY_PROGRAM}>
                      {t('program_any')}
                    </SelectItem>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {isRtl ? p.titleAr : p.titleEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="preferredDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('preferred_date')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      type="date"
                      className={inputClass}
                    />
                  </FormControl>
                  <span
                    className={`text-[12px] text-fg3 ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {t('preferred_date_hint')}
                  </span>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="attendeeCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('attendee_count')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      inputMode="numeric"
                      placeholder={t('attendee_count_placeholder')}
                      className={inputClass}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        field.onChange(v === '' ? null : Number(v))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-5 m-0 p-0 border-0">
          <legend className="section-eyebrow !text-fg3 mb-1">
            {t('section_message')}
          </legend>
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('message')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    rows={6}
                    placeholder={t('message_placeholder')}
                    className={textareaClass}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn-pill btn-pill-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? t('submitting') : t('submit')}
            <span aria-hidden>{isRtl ? '←' : '→'}</span>
          </button>
          <span className="sr-only">{tProgs('request_cta')}</span>
        </div>
      </form>
    </Form>
  )
}
