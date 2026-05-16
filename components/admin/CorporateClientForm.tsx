'use client'

import { useState } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  corporateClientSchema,
  type CorporateClientInput,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StorageKeyUploadField } from './StorageKeyUploadField'
import { AdminFormActions } from './AdminFormActions'

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const

const DEFAULTS: CorporateClientInput = {
  name: '',
  nameAr: '',
  logoUrl: '',
  websiteUrl: '',
  status: 'PUBLISHED',
  orderIndex: 0,
}

type Props = {
  initialValues?: Partial<CorporateClientInput>
  mode: 'create' | 'edit'
  clientId?: string
}

export function CorporateClientForm({ initialValues, mode, clientId }: Props) {
  const router = useRouter()
  const t = useTranslations('admin.corporate_client_form')
  const tActions = useTranslations('admin.actions')
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<CorporateClientInput>({
    resolver: zodResolver(corporateClientSchema) as Resolver<CorporateClientInput>,
    defaultValues: { ...DEFAULTS, ...initialValues },
  })

  async function onSubmit(values: CorporateClientInput) {
    setSubmitting(true)
    try {
      const url =
        mode === 'create'
          ? '/api/admin/corporate/clients'
          : `/api/admin/corporate/clients/${clientId}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_saved'))
      router.push('/admin/corporate/clients')
    } catch (err) {
      console.error('[CorporateClientForm]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete() {
    if (!clientId) return
    try {
      const res = await fetch(`/api/admin/corporate/clients/${clientId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_deleted'))
      router.push('/admin/corporate/clients')
    } catch (err) {
      console.error('[CorporateClientForm/delete]', err)
      toast.error(tActions('error_generic'))
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-6 lg:grid-cols-[1fr_320px]"
        noValidate
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="PepsiCo" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nameAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name_ar')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} dir="rtl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('logo_url')}</FormLabel>
                <FormControl>
                  <StorageKeyUploadField
                    context="client-logo"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="/clients/pepsico.png"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="websiteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('website_url')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder="https://www.pepsico.com"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <aside className="space-y-5 self-start rounded-md border border-border bg-bg-elevated p-5">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('status')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="orderIndex"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('order_index')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <AdminFormActions
            mode={mode}
            submitting={submitting}
            onCancel={() => router.push('/admin/corporate/clients')}
            onDelete={onDelete}
          />
        </aside>
      </form>
    </Form>
  )
}
