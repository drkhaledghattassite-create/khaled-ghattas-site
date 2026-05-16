'use client'

import { useState } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { bookSchema, type BookInput } from '@/lib/validators/book'
import { CONTENT_STATUSES } from '@/lib/validators/article'
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
import { Checkbox } from '@/components/ui/checkbox'
import { StorageKeyUploadField } from './StorageKeyUploadField'
import { AdminFormActions } from './AdminFormActions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const DEFAULTS: BookInput = {
  slug: '',
  titleAr: '',
  titleEn: '',
  subtitleAr: '',
  subtitleEn: '',
  descriptionAr: '',
  descriptionEn: '',
  coverImage: '',
  price: '0',
  currency: 'USD',
  digitalFile: '',
  externalUrl: '',
  publisher: '',
  publicationYear: null,
  status: 'DRAFT',
  featured: false,
  orderIndex: 0,
}

type Props = {
  initialValues?: Partial<BookInput>
  mode: 'create' | 'edit'
  bookId?: string
}

export function BookForm({ initialValues, mode, bookId }: Props) {
  const router = useRouter()
  const t = useTranslations('admin.book_form')
  const tActions = useTranslations('admin.actions')
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<BookInput>({
    resolver: zodResolver(bookSchema) as Resolver<BookInput>,
    defaultValues: { ...DEFAULTS, ...initialValues },
  })

  async function onSubmit(values: BookInput) {
    setSubmitting(true)
    try {
      const url =
        mode === 'create' ? '/api/admin/books' : `/api/admin/books/${bookId}`
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
      router.push('/admin/books')
    } catch (err) {
      console.error('[BookForm]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete() {
    if (!bookId) return
    try {
      const res = await fetch(`/api/admin/books/${bookId}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_deleted'))
      router.push('/admin/books')
    } catch (err) {
      console.error('[BookForm/delete]', err)
      toast.error(tActions('error_generic'))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_320px]" noValidate>
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('slug')}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="titleAr" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('title_ar')}</FormLabel>
                <FormControl><Input {...field} dir="rtl" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="titleEn" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('title_en')}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="subtitleAr" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('subtitle_ar')}</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} dir="rtl" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="subtitleEn" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('subtitle_en')}</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="descriptionAr" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('description_ar')}</FormLabel>
              <FormControl><Textarea {...field} dir="rtl" rows={5} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="descriptionEn" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('description_en')}</FormLabel>
              <FormControl><Textarea {...field} rows={5} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="digitalFile" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('digital_file')}</FormLabel>
                <FormControl>
                  <StorageKeyUploadField
                    context="book-digital-file"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="https://…/book.pdf"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="externalUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('external_url')}</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} placeholder="https://amazon.com/…" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <aside className="space-y-5 self-start rounded-md border border-border bg-bg-elevated p-5">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('status')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {CONTENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />

          <FormField control={form.control} name="coverImage" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('cover_image')}</FormLabel>
              <FormControl>
                <StorageKeyUploadField
                  context="book-cover"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="/placeholder/nav/nav-1.jpg"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('price')}</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} placeholder="24.00" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="currency" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('currency')}</FormLabel>
                <FormControl><Input {...field} maxLength={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="publisher" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('publisher')}</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="publicationYear" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('publication_year')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="featured" render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              <FormLabel className="!mt-0">{t('featured')}</FormLabel>
            </FormItem>
          )} />

          <FormField control={form.control} name="orderIndex" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('order_index')}</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <AdminFormActions
            mode={mode}
            submitting={submitting}
            onCancel={() => router.push('/admin/books')}
            onDelete={onDelete}
          />
        </aside>
      </form>
    </Form>
  )
}
