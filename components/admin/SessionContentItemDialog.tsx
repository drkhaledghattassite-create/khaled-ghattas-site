'use client'

/**
 * Create-or-edit dialog for a single session content item.
 *
 * Wraps a react-hook-form + zod schema in a Dialog primitive. The schema is
 * a thin client-side mirror of the server-action zod schema in
 * `app/[locale]/(admin)/admin/books/[id]/content/actions.ts` — keep them in
 * sync. The server is authoritative; the client mirror exists only for
 * instant feedback (red field outline, inline errors) before the action
 * fires.
 */

import { useEffect } from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SessionItem, SessionItemType } from '@/lib/db/schema'

const ITEM_TYPES: SessionItemType[] = ['VIDEO', 'AUDIO', 'PDF']

// Form schema mirrors the server action's createInputSchema —
// description and durationSeconds are nullable but the form treats them as
// strings/optional-numbers so the underlying inputs stay controlled.
//
// Per-type validation (mirrored on the server in actions.ts):
// - VIDEO/AUDIO require a positive duration so the playlist can render
//   length next to the type chip and the progress bar has a denominator.
// - PDF ignores duration entirely (the field is hidden in the UI; any
//   stale value left over from switching from VIDEO/AUDIO is wiped on
//   submit so the row reads cleanly in the editor list).
const formSchema = z
  .object({
    itemType: z.enum(['VIDEO', 'AUDIO', 'PDF']),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000),
    storageKey: z.string().trim().min(1).max(500),
    durationSeconds: z
      .union([z.literal(''), z.coerce.number().int().min(0).max(60 * 60 * 24)])
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.itemType === 'VIDEO' || value.itemType === 'AUDIO') {
      const d = value.durationSeconds
      const numeric = typeof d === 'number' ? d : Number(d)
      if (!Number.isFinite(numeric) || numeric <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['durationSeconds'],
          message: 'duration-required',
        })
      }
    }
  })

type FormValues = z.infer<typeof formSchema>

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  initial: SessionItem | null
  onClose: () => void
  onSubmit: (values: {
    itemType: SessionItemType
    title: string
    description: string | null
    storageKey: string
    durationSeconds: number | null
  }) => Promise<boolean>
}

export function SessionContentItemDialog({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const t = useTranslations('admin.session_content')

  const defaults: FormValues = {
    itemType: initial?.itemType ?? 'VIDEO',
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    storageKey: initial?.storageKey ?? '',
    durationSeconds:
      initial?.durationSeconds != null && initial.durationSeconds > 0
        ? initial.durationSeconds
        : '',
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: defaults,
  })

  // Re-seed the form whenever the dialog opens for a different item or
  // toggles between create/edit modes. Without this, switching from
  // editing item A to creating a new item leaves A's data in the fields.
  useEffect(() => {
    if (open) form.reset(defaults)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id, mode])

  // Watch the type so storage-key hints/placeholders + duration visibility
  // can react in real time as the admin flips between Video / Audio / PDF.
  const watchedType = useWatch({ control: form.control, name: 'itemType' })
  const showDuration = watchedType === 'VIDEO' || watchedType === 'AUDIO'

  async function handleSubmit(values: FormValues) {
    // PDF ignores duration — wipe any value left over from a previous
    // selection so the row reads cleanly in the editor list. VIDEO/AUDIO
    // are guaranteed numeric by the superRefine guard above.
    const isPdf = values.itemType === 'PDF'
    const ok = await onSubmit({
      itemType: values.itemType,
      title: values.title.trim(),
      description: values.description.trim() ? values.description.trim() : null,
      storageKey: values.storageKey.trim(),
      durationSeconds: isPdf
        ? null
        : values.durationSeconds === '' || values.durationSeconds == null
          ? null
          : Number(values.durationSeconds),
    })
    if (ok) {
      form.reset(defaults)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t('dialog_create_title') : t('dialog_edit_title')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? t('dialog_create_description')
              : t('dialog_edit_description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="itemType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('field_item_type')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ITEM_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`item_type_${type.toLowerCase()}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('field_title')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('field_title_placeholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('field_description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder={t('field_description_placeholder')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="storageKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('field_storage_key')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      dir="ltr"
                      placeholder={t(
                        `field_storage_key_placeholder_${watchedType.toLowerCase()}` as
                          | 'field_storage_key_placeholder_video'
                          | 'field_storage_key_placeholder_audio'
                          | 'field_storage_key_placeholder_pdf',
                      )}
                    />
                  </FormControl>
                  <p className="text-[11px] text-fg3">
                    {t(
                      `field_storage_key_hint_${watchedType.toLowerCase()}` as
                        | 'field_storage_key_hint_video'
                        | 'field_storage_key_hint_audio'
                        | 'field_storage_key_hint_pdf',
                    )}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showDuration && (
              <FormField
                control={form.control}
                name="durationSeconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('field_duration')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder={t('field_duration_placeholder')}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === '' ? '' : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <p className="text-[11px] text-fg3">
                      {t('field_duration_hint_required')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={form.formState.isSubmitting}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {mode === 'create' ? t('create_submit') : t('save_submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
