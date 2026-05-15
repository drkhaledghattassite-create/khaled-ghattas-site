'use client'

import { useState } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
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
import { StorageKeyUploadField } from './StorageKeyUploadField'

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
  const tForms = useTranslations('admin.forms')
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
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full border border-fg1 bg-fg1 px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-bg font-display font-semibold transition-colors hover:bg-accent hover:border-accent hover:text-accent-fg disabled:opacity-60"
            >
              {submitting ? tForms('saving') : tForms('save')}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/corporate/clients')}
              className="rounded-full border border-border px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-fg1 font-display font-semibold hover:bg-bg-deep transition-colors"
            >
              {tForms('cancel')}
            </button>
            {mode === 'edit' && (
              <AlertDialog>
                <AlertDialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-full border border-accent/60 px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-accent font-display font-semibold transition-colors hover:bg-accent hover:text-accent-fg">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  {tForms('delete')}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {tActions('confirm_delete')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {tActions('no_undo')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tForms('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>
                      {tForms('delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </aside>
      </form>
    </Form>
  )
}
