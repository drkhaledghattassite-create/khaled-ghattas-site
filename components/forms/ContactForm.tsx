'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { contactSchema, type ContactInput } from '@/lib/validators/contact'
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

export function ContactForm() {
  const t = useTranslations('contact.form')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [submitting, setSubmitting] = useState(false)

  const labelStyle: React.CSSProperties = {
    fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
    fontStyle: isRtl ? 'normal' : 'italic',
    fontWeight: 400,
    fontSize: isRtl ? 14 : 13,
    color: 'var(--color-ink-muted)',
    letterSpacing: isRtl ? 0 : '0.02em',
  }

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', subject: '', message: '' },
  })

  async function onSubmit(values: ContactInput) {
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 400))
    setSubmitting(false)
    toast.success(t('submitted'))
    form.reset()
    return values
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
        noValidate
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel style={labelStyle}>{t('name')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('name_placeholder')}
                  className="border-x-0 border-t-0 border-b border-ink/35 bg-transparent rounded-none px-0 py-2 text-[16px] focus-visible:border-brass focus-visible:ring-0"
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
              <FormLabel style={labelStyle}>{t('email')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder={t('email_placeholder')}
                  className="border-x-0 border-t-0 border-b border-ink/35 bg-transparent rounded-none px-0 py-2 text-[16px] focus-visible:border-brass focus-visible:ring-0"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel style={labelStyle}>{t('subject')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('subject_placeholder')}
                  className="border-x-0 border-t-0 border-b border-ink/35 bg-transparent rounded-none px-0 py-2 text-[16px] focus-visible:border-brass focus-visible:ring-0"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel style={labelStyle}>{t('message')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={6}
                  placeholder={t('message_placeholder')}
                  className="border border-ink/35 bg-paper-soft rounded-md px-3 py-3 text-[16px] focus-visible:border-brass focus-visible:ring-0"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-[10px] min-h-[42px] rounded-full border border-ink bg-ink text-paper-soft text-[13px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] hover:bg-brass-deep hover:border-brass-deep active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold [dir=rtl]:text-[13.5px]"
          >
            <span aria-hidden className="block h-[7px] w-[7px] rounded-full bg-current" />
            {submitting ? t('submitting') : t('submit')}
          </button>
        </div>
      </form>
    </Form>
  )
}
