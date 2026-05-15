'use client'

import { useState } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import {
  corporateProgramSchema,
  type CorporateProgramInput,
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
import { Switch } from '@/components/ui/switch'
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

const DEFAULTS: CorporateProgramInput = {
  slug: '',
  titleAr: '',
  titleEn: '',
  descriptionAr: '',
  descriptionEn: '',
  durationAr: '',
  durationEn: '',
  audienceAr: '',
  audienceEn: '',
  coverImage: '',
  status: 'PUBLISHED',
  featured: false,
  orderIndex: 0,
}

type Props = {
  initialValues?: Partial<CorporateProgramInput>
  mode: 'create' | 'edit'
  programId?: string
}

export function CorporateProgramForm({ initialValues, mode, programId }: Props) {
  const router = useRouter()
  const t = useTranslations('admin.corporate_program_form')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<CorporateProgramInput>({
    resolver: zodResolver(corporateProgramSchema) as Resolver<CorporateProgramInput>,
    defaultValues: { ...DEFAULTS, ...initialValues },
  })

  async function onSubmit(values: CorporateProgramInput) {
    setSubmitting(true)
    try {
      const url =
        mode === 'create'
          ? '/api/admin/corporate/programs'
          : `/api/admin/corporate/programs/${programId}`
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
      router.push('/admin/corporate/programs')
    } catch (err) {
      console.error('[CorporateProgramForm]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete() {
    if (!programId) return
    try {
      const res = await fetch(`/api/admin/corporate/programs/${programId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_deleted'))
      router.push('/admin/corporate/programs')
    } catch (err) {
      console.error('[CorporateProgramForm/delete]', err)
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
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('slug')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="leadership-essence" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="titleAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('title_ar')}</FormLabel>
                  <FormControl>
                    <Input {...field} dir="rtl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="titleEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('title_en')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="descriptionAr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('description_ar')}</FormLabel>
                <FormControl>
                  <Textarea {...field} dir="rtl" rows={6} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="descriptionEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('description_en')}</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={6} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="durationAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('duration_ar')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      dir="rtl"
                      placeholder="ساعة واحدة"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="durationEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('duration_en')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="1 hour"
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
              name="audienceAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('audience_ar')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      dir="rtl"
                      placeholder="جميع الموظفين"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="audienceEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('audience_en')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="All employees"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
            name="featured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between gap-4">
                <FormLabel>{t('featured')}</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="coverImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('cover_image')}</FormLabel>
                <FormControl>
                  <StorageKeyUploadField
                    context="program-cover"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="/programs/leadership.jpg"
                  />
                </FormControl>
                <FormMessage />
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
              onClick={() => router.push('/admin/corporate/programs')}
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
