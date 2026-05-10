'use client'

/**
 * Phase C2 — test builder for /admin/tests/new and /admin/tests/[id]/edit.
 *
 * Owns the form state for an entire test (metadata + questions + options).
 * Internal local state instead of react-hook-form because:
 *   - Nested array-of-array editing (questions → options) with reorder is
 *     awkward in RHF without `useFieldArray` per-question, and that adds
 *     surface for hooks-rule violations on the option layer.
 *   - We zod-parse the whole payload on submit, surfacing field-level
 *     errors ourselves. The validation summary in the sidebar is live and
 *     readable straight off the local state.
 *
 * Data flow:
 *   - Client validates with `createTestSchema` / `updateTestSchema`.
 *   - Submit calls the corresponding action.
 *   - On `confirm_removals_required`, opens RemovalConfirmModal; on
 *     confirm, retries with `confirmRemovals: true`.
 *   - On `slug_taken`, surfaces a field-level error on the slug input.
 *   - On success in create flow: router.push to the edit page with a
 *     toast.
 */

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react'
import { useRouter } from '@/lib/i18n/navigation'
import {
  createTestAction,
  updateTestAction,
} from '@/app/[locale]/(admin)/admin/tests/actions'
import {
  createTestSchema,
  TEST_CATEGORIES,
  updateTestSchema,
  type TestCategory,
} from '@/lib/validators/test'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Link } from '@/lib/i18n/navigation'
import { DeleteTestModal } from './DeleteTestModal'
import { RemovalConfirmModal } from './RemovalConfirmModal'
import type { AdminTestRow } from './AdminTestsListPage'
import { deleteTestAction } from '@/app/[locale]/(admin)/admin/tests/actions'

/* ── Local form state types ──────────────────────────────────────────── */

type FormOption = {
  id?: string
  labelAr: string
  labelEn: string
  isCorrect: boolean
}

type FormQuestion = {
  id?: string
  promptAr: string
  promptEn: string
  explanationAr: string | null
  explanationEn: string | null
  options: FormOption[]
}

type FormState = {
  id?: string
  slug: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  introAr: string
  introEn: string
  category: TestCategory
  estimatedMinutes: number
  coverImageUrl: string | null
  isPublished: boolean
  displayOrder: number
  questions: FormQuestion[]
}

export type TestBuilderInitial = {
  id: string
  slug: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  introAr: string
  introEn: string
  category: string
  estimatedMinutes: number
  coverImageUrl: string | null
  isPublished: boolean
  displayOrder: number
  questions: Array<{
    id: string
    promptAr: string
    promptEn: string
    explanationAr: string | null
    explanationEn: string | null
    options: Array<{
      id: string
      labelAr: string
      labelEn: string
      isCorrect: boolean
    }>
  }>
}

type Props = {
  mode: 'create' | 'edit'
  locale: 'ar' | 'en'
  initial: TestBuilderInitial | null
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function emptyOption(): FormOption {
  return { labelAr: '', labelEn: '', isCorrect: false }
}

function emptyQuestion(): FormQuestion {
  return {
    promptAr: '',
    promptEn: '',
    explanationAr: '',
    explanationEn: '',
    options: [
      { labelAr: '', labelEn: '', isCorrect: true },
      { labelAr: '', labelEn: '', isCorrect: false },
    ],
  }
}

function slugifyTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function isOptionEmpty(o: FormOption): boolean {
  return !o.labelAr.trim() && !o.labelEn.trim()
}

function readableCategory(c: TestCategory): TestCategory {
  return c
}

const A_TO_F = ['A', 'B', 'C', 'D', 'E', 'F']

/* ── Component ────────────────────────────────────────────────────────── */

export function TestBuilderPage({ mode, locale, initial }: Props) {
  const t = useTranslations('admin.tests.builder')
  const tList = useTranslations('admin.tests.list')
  const tCat = useTranslations('dashboard.ask.form')
  const tForms = useTranslations('admin.forms')
  const router = useRouter()

  const [state, setState] = useState<FormState>(() => {
    if (initial) {
      return {
        id: initial.id,
        slug: initial.slug,
        titleAr: initial.titleAr,
        titleEn: initial.titleEn,
        descriptionAr: initial.descriptionAr,
        descriptionEn: initial.descriptionEn,
        introAr: initial.introAr,
        introEn: initial.introEn,
        category: ((TEST_CATEGORIES as readonly string[]).includes(
          initial.category,
        )
          ? initial.category
          : 'general') as TestCategory,
        estimatedMinutes: initial.estimatedMinutes,
        coverImageUrl: initial.coverImageUrl,
        isPublished: initial.isPublished,
        displayOrder: initial.displayOrder,
        questions: initial.questions.map((q) => ({
          id: q.id,
          promptAr: q.promptAr,
          promptEn: q.promptEn,
          explanationAr: q.explanationAr ?? '',
          explanationEn: q.explanationEn ?? '',
          options: q.options.map((o) => ({
            id: o.id,
            labelAr: o.labelAr,
            labelEn: o.labelEn,
            isCorrect: o.isCorrect,
          })),
        })),
      }
    }
    return {
      slug: '',
      titleAr: '',
      titleEn: '',
      descriptionAr: '',
      descriptionEn: '',
      introAr: '',
      introEn: '',
      category: 'general' as TestCategory,
      estimatedMinutes: 5,
      coverImageUrl: null,
      isPublished: false,
      displayOrder: 0,
      questions: [emptyQuestion()],
    }
  })
  // Track when admin manually edits the slug so auto-fill from title stops.
  const [slugDirty, setSlugDirty] = useState(mode === 'edit')
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()
  const [removalConfirm, setRemovalConfirm] =
    useState<{
      removedQuestionCount: number
      removedOptionCount: number
      affectedAttemptCount: number
    } | null>(null)
  const [showDelete, setShowDelete] = useState(false)

  /* ── Form ops ───────────────────────────────────────────────────────── */

  const updateField = useCallback(<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateQuestion = useCallback(
    (idx: number, patch: Partial<FormQuestion>) => {
      setState((prev) => {
        const next = prev.questions.slice()
        next[idx] = { ...next[idx], ...patch }
        return { ...prev, questions: next }
      })
    },
    [],
  )

  const updateOption = useCallback(
    (qIdx: number, oIdx: number, patch: Partial<FormOption>) => {
      setState((prev) => {
        const next = prev.questions.slice()
        const opts = next[qIdx].options.slice()
        opts[oIdx] = { ...opts[oIdx], ...patch }
        // Marking one option correct un-marks the others (radio semantics).
        if (patch.isCorrect === true) {
          for (let i = 0; i < opts.length; i++) {
            if (i !== oIdx) opts[i] = { ...opts[i], isCorrect: false }
          }
        }
        next[qIdx] = { ...next[qIdx], options: opts }
        return { ...prev, questions: next }
      })
    },
    [],
  )

  const addQuestion = useCallback(() => {
    setState((prev) => ({
      ...prev,
      questions: [...prev.questions, emptyQuestion()],
    }))
  }, [])

  const removeQuestion = useCallback((idx: number) => {
    setState((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }))
  }, [])

  const moveQuestion = useCallback(
    (idx: number, dir: 'up' | 'down') => {
      setState((prev) => {
        const next = prev.questions.slice()
        const target = dir === 'up' ? idx - 1 : idx + 1
        if (target < 0 || target >= next.length) return prev
        ;[next[idx], next[target]] = [next[target], next[idx]]
        return { ...prev, questions: next }
      })
    },
    [],
  )

  const addOption = useCallback((qIdx: number) => {
    setState((prev) => {
      const q = prev.questions[qIdx]
      if (q.options.length >= 6) return prev
      const next = prev.questions.slice()
      next[qIdx] = { ...q, options: [...q.options, emptyOption()] }
      return { ...prev, questions: next }
    })
  }, [])

  const removeOption = useCallback((qIdx: number, oIdx: number) => {
    setState((prev) => {
      const q = prev.questions[qIdx]
      if (q.options.length <= 2) return prev
      const opts = q.options.filter((_, i) => i !== oIdx)
      // If we removed the correct one, default the first to correct.
      const hasCorrect = opts.some((o) => o.isCorrect)
      if (!hasCorrect && opts.length > 0) {
        opts[0] = { ...opts[0], isCorrect: true }
      }
      const next = prev.questions.slice()
      next[qIdx] = { ...q, options: opts }
      return { ...prev, questions: next }
    })
  }, [])

  const moveOption = useCallback(
    (qIdx: number, oIdx: number, dir: 'up' | 'down') => {
      setState((prev) => {
        const q = prev.questions[qIdx]
        const opts = q.options.slice()
        const target = dir === 'up' ? oIdx - 1 : oIdx + 1
        if (target < 0 || target >= opts.length) return prev
        ;[opts[oIdx], opts[target]] = [opts[target], opts[oIdx]]
        const next = prev.questions.slice()
        next[qIdx] = { ...q, options: opts }
        return { ...prev, questions: next }
      })
    },
    [],
  )

  const toggleCollapsed = useCallback((idx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  /* ── Slug helpers ───────────────────────────────────────────────────── */

  const onTitleChange = useCallback(
    (which: 'titleAr' | 'titleEn', value: string) => {
      setState((prev) => {
        const nextState = { ...prev, [which]: value }
        if (!slugDirty && mode === 'create' && which === 'titleEn') {
          // Auto-fill slug from English title only when admin hasn't typed
          // a slug manually. AR title doesn't drive the slug — Latin
          // characters are required (regex enforces).
          nextState.slug = slugifyTitle(value)
        }
        return nextState
      })
    },
    [mode, slugDirty],
  )

  const onSlugChange = useCallback((value: string) => {
    setSlugDirty(true)
    setState((prev) => ({ ...prev, slug: value }))
  }, [])

  /* ── Live validation summary ───────────────────────────────────────── */

  const liveValidation = useMemo(() => {
    let missingTranslations = 0
    let allCorrectMarked = true
    let optionsCount = 0
    for (const q of state.questions) {
      if (!q.promptAr.trim()) missingTranslations++
      if (!q.promptEn.trim()) missingTranslations++
      const correct = q.options.filter((o) => o.isCorrect).length
      if (correct !== 1) allCorrectMarked = false
      for (const o of q.options) {
        optionsCount++
        if (!o.labelAr.trim()) missingTranslations++
        if (!o.labelEn.trim()) missingTranslations++
      }
    }
    if (!state.titleAr.trim()) missingTranslations++
    if (!state.titleEn.trim()) missingTranslations++
    if (!state.descriptionAr.trim()) missingTranslations++
    if (!state.descriptionEn.trim()) missingTranslations++
    if (!state.introAr.trim()) missingTranslations++
    if (!state.introEn.trim()) missingTranslations++
    return {
      questions: state.questions.length,
      options: optionsCount,
      allCorrectMarked,
      missingTranslations,
    }
  }, [state])

  /* ── Submit ─────────────────────────────────────────────────────────── */

  const buildPayload = useCallback(
    (confirmRemovals: boolean, overrides?: Partial<FormState>) => {
      const effective = overrides ? { ...state, ...overrides } : state
      const trimmedSlug = effective.slug.trim()
      const cover =
        effective.coverImageUrl && effective.coverImageUrl.trim()
          ? effective.coverImageUrl.trim()
          : null
      const base = {
        slug: trimmedSlug,
        titleAr: effective.titleAr.trim(),
        titleEn: effective.titleEn.trim(),
        descriptionAr: effective.descriptionAr.trim(),
        descriptionEn: effective.descriptionEn.trim(),
        introAr: effective.introAr.trim(),
        introEn: effective.introEn.trim(),
        category: effective.category,
        estimatedMinutes: effective.estimatedMinutes,
        coverImageUrl: cover,
        isPublished: effective.isPublished,
        displayOrder: effective.displayOrder,
        questions: effective.questions.map((q) => ({
          id: q.id,
          promptAr: q.promptAr.trim(),
          promptEn: q.promptEn.trim(),
          explanationAr: q.explanationAr?.trim() || null,
          explanationEn: q.explanationEn?.trim() || null,
          options: q.options
            .filter((o) => !isOptionEmpty(o))
            .map((o) => ({
              id: o.id,
              labelAr: o.labelAr.trim(),
              labelEn: o.labelEn.trim(),
              isCorrect: o.isCorrect,
            })),
        })),
      }
      if (mode === 'create') return base
      return { ...base, confirmRemovals }
    },
    [mode, state],
  )

  const submit = useCallback(
    (confirmRemovals: boolean, overrides?: Partial<FormState>) => {
      // Client-side parse first so we surface field-level errors
      // immediately. Server re-parses with the same schema.
      // Overrides let "Save and publish" inject `isPublished: true`
      // synchronously without depending on a setState that hasn't
      // committed yet — closure capture would otherwise see the old
      // (false) value.
      const payload = buildPayload(confirmRemovals, overrides)
      // Branch by mode so TypeScript narrows parsed.data to the right
      // input shape — the union of create/update inputs has different
      // required fields (confirmRemovals only on update).
      const parsed =
        mode === 'create'
          ? createTestSchema.safeParse(payload)
          : updateTestSchema.safeParse(payload)
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {}
        for (const issue of parsed.error.issues) {
          const path = issue.path.join('.')
          if (issue.message === 'exactly_one_correct') {
            fieldErrors[path] = t('errors.exactly_one_correct')
          } else if (issue.message === 'invalid_slug') {
            fieldErrors[path] = t('errors.invalid_slug')
          } else {
            fieldErrors[path] = t('errors.field_required')
          }
        }
        setErrors(fieldErrors)
        toast.error(t('toast.error_validation'))
        return
      }
      setErrors({})

      startTransition(async () => {
        try {
          const res =
            mode === 'create'
              ? await createTestAction(
                  parsed.data as ReturnType<
                    typeof createTestSchema.parse
                  >,
                )
              : await updateTestAction({
                  ...(parsed.data as ReturnType<
                    typeof updateTestSchema.parse
                  >),
                  id: state.id!,
                })
          if (res.ok) {
            toast.success(
              mode === 'create' ? t('toast.created') : t('toast.updated'),
            )
            if (mode === 'create' && 'id' in res) {
              router.push(`/admin/tests/${res.id}/edit?created=1`)
            } else {
              router.refresh()
            }
            setRemovalConfirm(null)
            return
          }
          if (res.error === 'slug_taken') {
            setErrors({ slug: t('errors.slug_taken') })
            toast.error(t('toast.error_slug_taken'))
            return
          }
          if (res.error === 'confirm_removals_required') {
            setRemovalConfirm({
              removedQuestionCount: res.data.removedQuestionCount,
              removedOptionCount: res.data.removedOptionCount,
              affectedAttemptCount: res.data.affectedAttemptCount,
            })
            return
          }
          if (res.error === 'unauthorized' || res.error === 'forbidden') {
            toast.error(tForms('error_forbidden'))
            return
          }
          if (res.error === 'not_found') {
            toast.error(t('toast.error_not_found'))
            return
          }
          if (res.error === 'validation') {
            toast.error(t('toast.error_validation'))
            return
          }
          toast.error(t('toast.error_generic'))
        } catch (err) {
          console.error('[TestBuilderPage submit]', err)
          toast.error(t('toast.error_generic'))
        }
      })
    },
    [buildPayload, mode, router, state.id, t, tForms],
  )

  const onConfirmRemoval = useCallback(() => {
    setRemovalConfirm(null)
    submit(true)
  }, [submit])

  /* ── Delete (edit only) ───────────────────────────────────────────── */

  const onDelete = useCallback(() => {
    if (!state.id) return
    startTransition(async () => {
      try {
        const res = await deleteTestAction({ id: state.id! })
        if (res.ok) {
          toast.success(tList('toast.delete_success'))
          router.push('/admin/tests')
          return
        }
        toast.error(t('toast.error_generic'))
      } catch (err) {
        console.error('[TestBuilderPage delete]', err)
        toast.error(t('toast.error_generic'))
      }
    })
  }, [router, state.id, t, tList])

  // Derive a row shape for the delete modal.
  const deleteRow: AdminTestRow | null = useMemo(() => {
    if (mode !== 'edit' || !state.id) return null
    return {
      id: state.id,
      slug: state.slug,
      titleAr: state.titleAr,
      titleEn: state.titleEn,
      category: state.category,
      isPublished: state.isPublished,
      questionCount: state.questions.length,
      attemptCount: 0,
      averageScore: null,
      createdAt: new Date().toISOString(),
    }
  }, [mode, state])

  /* ── Render ─────────────────────────────────────────────────────────── */

  const heading =
    mode === 'create' ? t('heading_create') : t('heading_edit')
  const slugChanged =
    mode === 'edit' && initial != null && state.slug !== initial.slug

  return (
    <div className="space-y-5">
      <h1 className="text-fg1 font-display font-semibold text-[22px] tracking-[-0.02em]">
        {heading}
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Metadata */}
          <Section title={t('section.metadata')}>
            <Field label={t('field.slug_label')} error={errors.slug}>
              <input
                type="text"
                dir="ltr"
                value={state.slug}
                onChange={(e) => onSlugChange(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-[14px] text-fg1 outline-none transition-colors focus:border-accent"
                placeholder="my-reflection-test"
              />
              <p className="text-[11px] text-fg3">{t('field.slug_help')}</p>
              {slugChanged && (
                <p className="text-[11px] text-warning">
                  {t('field.slug_warn_changing')}
                </p>
              )}
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('field.title_ar')} error={errors.titleAr}>
                <input
                  type="text"
                  dir="rtl"
                  value={state.titleAr}
                  onChange={(e) => onTitleChange('titleAr', e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-[14px] text-fg1 outline-none transition-colors focus:border-accent"
                />
              </Field>
              <Field label={t('field.title_en')} error={errors.titleEn}>
                <input
                  type="text"
                  value={state.titleEn}
                  onChange={(e) => onTitleChange('titleEn', e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-[14px] text-fg1 outline-none transition-colors focus:border-accent"
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={t('field.description_ar')}
                error={errors.descriptionAr}
              >
                <input
                  type="text"
                  dir="rtl"
                  value={state.descriptionAr}
                  onChange={(e) =>
                    updateField('descriptionAr', e.target.value)
                  }
                  className="h-9 w-full rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-[14px] text-fg1 outline-none transition-colors focus:border-accent"
                />
              </Field>
              <Field
                label={t('field.description_en')}
                error={errors.descriptionEn}
              >
                <input
                  type="text"
                  value={state.descriptionEn}
                  onChange={(e) =>
                    updateField('descriptionEn', e.target.value)
                  }
                  className="h-9 w-full rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-[14px] text-fg1 outline-none transition-colors focus:border-accent"
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('field.intro_ar')} error={errors.introAr}>
                <textarea
                  dir="rtl"
                  value={state.introAr}
                  onChange={(e) => updateField('introAr', e.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-[14px] text-fg1 outline-none transition-colors focus:border-accent"
                />
              </Field>
              <Field label={t('field.intro_en')} error={errors.introEn}>
                <textarea
                  value={state.introEn}
                  onChange={(e) => updateField('introEn', e.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-[14px] text-fg1 outline-none transition-colors focus:border-accent"
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={t('field.category_label')} error={errors.category}>
                <Select
                  value={state.category}
                  onValueChange={(next) =>
                    updateField('category', next as TestCategory)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {tCat(`category_${readableCategory(c)}` as 'category_general')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label={t('field.estimated_minutes_label')}
                error={errors.estimatedMinutes}
              >
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={state.estimatedMinutes}
                  onChange={(e) =>
                    updateField(
                      'estimatedMinutes',
                      Math.max(1, Number(e.target.value) || 1),
                    )
                  }
                  className="h-9 w-full rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-[14px] text-fg1 outline-none transition-colors focus:border-accent"
                />
              </Field>
              <Field
                label={t('field.display_order_label')}
                error={errors.displayOrder}
              >
                <input
                  type="number"
                  min={0}
                  value={state.displayOrder}
                  onChange={(e) =>
                    updateField(
                      'displayOrder',
                      Math.max(0, Number(e.target.value) || 0),
                    )
                  }
                  className="h-9 w-full rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-[14px] text-fg1 outline-none transition-colors focus:border-accent"
                />
                <p className="text-[11px] text-fg3">
                  {t('field.display_order_help')}
                </p>
              </Field>
            </div>
            <Field
              label={t('field.cover_image_url_label')}
              error={errors.coverImageUrl}
            >
              <input
                type="url"
                dir="ltr"
                value={state.coverImageUrl ?? ''}
                onChange={(e) =>
                  updateField('coverImageUrl', e.target.value || null)
                }
                placeholder="https://"
                className="h-9 w-full rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-[14px] text-fg1 outline-none transition-colors focus:border-accent"
              />
              <p className="text-[11px] text-fg3">
                {t('field.cover_image_url_help')}
              </p>
            </Field>
          </Section>

          {/* Questions */}
          <Section
            title={`${t('section.questions')} (${state.questions.length})`}
            actions={
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center gap-1.5 rounded-full border border-fg1 bg-fg1 px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-bg font-display font-semibold transition-colors hover:bg-accent hover:border-accent hover:text-accent-fg"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {t('question.add_question')}
              </button>
            }
          >
            <div className="space-y-4">
              {state.questions.map((q, qIdx) => (
                <QuestionCard
                  key={qIdx}
                  q={q}
                  qIdx={qIdx}
                  total={state.questions.length}
                  collapsed={collapsed.has(qIdx)}
                  onToggleCollapse={() => toggleCollapsed(qIdx)}
                  onChange={(patch) => updateQuestion(qIdx, patch)}
                  onMoveUp={() => moveQuestion(qIdx, 'up')}
                  onMoveDown={() => moveQuestion(qIdx, 'down')}
                  onRemove={() => removeQuestion(qIdx)}
                  onAddOption={() => addOption(qIdx)}
                  onRemoveOption={(oIdx) => removeOption(qIdx, oIdx)}
                  onMoveOption={(oIdx, dir) => moveOption(qIdx, oIdx, dir)}
                  onChangeOption={(oIdx, patch) =>
                    updateOption(qIdx, oIdx, patch)
                  }
                  errors={errors}
                  locale={locale}
                />
              ))}
            </div>
            <div className="flex justify-center pt-3">
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-fg2 font-display font-semibold transition-colors hover:bg-bg-deep hover:text-fg1"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {t('question.add_question')}
              </button>
            </div>
          </Section>

          {/* Visibility */}
          <Section title={t('section.visibility')}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] text-fg1 font-display font-semibold">
                  {t('field.is_published_label')}
                </p>
                <p className="text-[11px] text-fg3">
                  {t('field.is_published_help')}
                </p>
              </div>
              <Switch
                checked={state.isPublished}
                onCheckedChange={(next) => updateField('isPublished', next)}
              />
            </div>
          </Section>
        </div>

        {/* Sidebar */}
        <aside className="sticky top-[64px] self-start space-y-3 rounded-md border border-border bg-bg-elevated p-5">
          <ul className="space-y-2 border-b border-border pb-4 text-[12px] text-fg2">
            <li className="flex items-center justify-between">
              <span>
                {t('sidebar.validation.questions_count', {
                  count: liveValidation.questions,
                })}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>
                {t('sidebar.validation.options_count', {
                  count: liveValidation.options,
                })}
              </span>
            </li>
            <li
              className={cn(
                'flex items-center justify-between',
                liveValidation.allCorrectMarked
                  ? 'text-success'
                  : 'text-warning',
              )}
            >
              <span>
                {liveValidation.allCorrectMarked
                  ? t('sidebar.validation.correct_marked')
                  : t('errors.exactly_one_correct')}
              </span>
            </li>
            <li
              className={cn(
                'flex items-center justify-between',
                liveValidation.missingTranslations === 0
                  ? 'text-success'
                  : 'text-warning',
              )}
            >
              <span>
                {liveValidation.missingTranslations === 0
                  ? t('sidebar.validation.translations_complete')
                  : t('sidebar.validation.translations_missing', {
                      count: liveValidation.missingTranslations,
                    })}
              </span>
            </li>
          </ul>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={pending}
              className="inline-flex items-center justify-center rounded-full border border-fg1 bg-fg1 px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-bg font-display font-semibold transition-colors hover:bg-accent hover:border-accent hover:text-accent-fg disabled:opacity-60"
            >
              {pending ? tForms('saving') : t('sidebar.save')}
            </button>
            {mode === 'create' && (
              <button
                type="button"
                onClick={() => {
                  // Reflect the choice in the form state so the toggle
                  // shows on, AND inject the override so submit's
                  // captured closure doesn't lose the publish flag.
                  updateField('isPublished', true)
                  submit(false, { isPublished: true })
                }}
                disabled={pending}
                className="inline-flex items-center justify-center rounded-full border border-accent bg-accent px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-accent-fg font-display font-semibold transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                {t('sidebar.save_publish')}
              </button>
            )}
            <Link
              href="/admin/tests"
              className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-fg1 font-display font-semibold hover:bg-bg-deep transition-colors"
            >
              {t('sidebar.cancel')}
            </Link>
            {mode === 'edit' && state.id && (
              <>
                <Link
                  href={`/admin/tests/${state.id}/analytics`}
                  className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-fg2 font-display font-semibold hover:bg-bg-deep hover:text-fg1 transition-colors"
                >
                  {t('sidebar.view_analytics')}
                </Link>
                <button
                  type="button"
                  onClick={() => setShowDelete(true)}
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-accent/60 px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-accent font-display font-semibold transition-colors hover:bg-accent hover:text-accent-fg disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  {t('sidebar.delete_test')}
                </button>
              </>
            )}
          </div>
        </aside>
      </div>

      {removalConfirm && (
        <RemovalConfirmModal
          {...removalConfirm}
          pending={pending}
          onConfirm={onConfirmRemoval}
          onClose={() => setRemovalConfirm(null)}
        />
      )}
      {showDelete && deleteRow && (
        <DeleteTestModal
          row={deleteRow}
          locale={locale}
          pending={pending}
          onConfirm={onDelete}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  )
}

/* ── Sub-components ───────────────────────────────────────────────────── */

function Section({
  title,
  actions,
  children,
}: {
  title: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <fieldset className="space-y-4 rounded-md border border-border bg-bg-elevated p-5">
      <div className="flex items-center justify-between gap-3">
        <legend className="px-1 text-[11px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
          {title}
        </legend>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </fieldset>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
        {label}
      </label>
      {children}
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  )
}

function QuestionCard({
  q,
  qIdx,
  total,
  collapsed,
  onToggleCollapse,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  onAddOption,
  onRemoveOption,
  onMoveOption,
  onChangeOption,
  errors,
  locale,
}: {
  q: FormQuestion
  qIdx: number
  total: number
  collapsed: boolean
  onToggleCollapse: () => void
  onChange: (patch: Partial<FormQuestion>) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onAddOption: () => void
  onRemoveOption: (oIdx: number) => void
  onMoveOption: (oIdx: number, dir: 'up' | 'down') => void
  onChangeOption: (oIdx: number, patch: Partial<FormOption>) => void
  errors: Record<string, string>
  locale: 'ar' | 'en'
}) {
  const t = useTranslations('admin.tests.builder.question')

  return (
    <div className="rounded-md border border-border bg-bg-deep p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-fg2 hover:bg-bg-elevated hover:text-fg1"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
        <span className="text-[13px] text-fg1 font-display font-semibold">
          {t('heading', { n: qIdx + 1 })}
        </span>
        <div className="ms-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={qIdx === 0}
            aria-label={t('move_up', { n: qIdx + 1 })}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-elevated hover:text-fg1 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={qIdx === total - 1}
            aria-label={t('move_down', { n: qIdx + 1 })}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-fg3 hover:bg-bg-elevated hover:text-fg1 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={total <= 1}
            aria-label={t('remove_question')}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-accent/80 hover:bg-accent-soft hover:text-accent disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label={t('prompt_ar_label')}
              error={errors[`questions.${qIdx}.promptAr`]}
            >
              <textarea
                dir="rtl"
                rows={3}
                value={q.promptAr}
                onChange={(e) => onChange({ promptAr: e.target.value })}
                className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-[14px] text-fg1 outline-none transition-colors focus:border-accent"
              />
            </Field>
            <Field
              label={t('prompt_en_label')}
              error={errors[`questions.${qIdx}.promptEn`]}
            >
              <textarea
                rows={3}
                value={q.promptEn}
                onChange={(e) => onChange({ promptEn: e.target.value })}
                className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-[14px] text-fg1 outline-none transition-colors focus:border-accent"
              />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
              {t('options_label')}
            </p>
            <div className="space-y-2">
              {q.options.map((o, oIdx) => (
                <OptionRow
                  key={oIdx}
                  o={o}
                  oIdx={oIdx}
                  total={q.options.length}
                  onChange={(patch) => onChangeOption(oIdx, patch)}
                  onRemove={() => onRemoveOption(oIdx)}
                  onMoveUp={() => onMoveOption(oIdx, 'up')}
                  onMoveDown={() => onMoveOption(oIdx, 'down')}
                  locale={locale}
                />
              ))}
            </div>
            {q.options.length < 6 && (
              <button
                type="button"
                onClick={onAddOption}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-fg2 font-display font-semibold transition-colors hover:bg-bg-elevated hover:text-fg1"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {t('add_option')}
              </button>
            )}
            {errors[`questions.${qIdx}.options`] && (
              <p className="mt-2 text-[11px] text-danger">
                {errors[`questions.${qIdx}.options`]}
              </p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label={t('explanation_ar_label')}>
              <textarea
                dir="rtl"
                rows={3}
                value={q.explanationAr ?? ''}
                onChange={(e) => onChange({ explanationAr: e.target.value })}
                className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-[14px] text-fg1 outline-none transition-colors focus:border-accent"
              />
            </Field>
            <Field label={t('explanation_en_label')}>
              <textarea
                rows={3}
                value={q.explanationEn ?? ''}
                onChange={(e) => onChange({ explanationEn: e.target.value })}
                className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-[14px] text-fg1 outline-none transition-colors focus:border-accent"
              />
            </Field>
          </div>
          <p className="text-[11px] text-fg3">{t('explanation_help')}</p>
        </div>
      )}
    </div>
  )
}

function OptionRow({
  o,
  oIdx,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  o: FormOption
  oIdx: number
  total: number
  onChange: (patch: Partial<FormOption>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  locale: 'ar' | 'en'
}) {
  const t = useTranslations('admin.tests.builder.question')
  const letter = A_TO_F[oIdx] ?? `${oIdx + 1}`

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-bg-elevated p-2.5">
      <span
        aria-hidden
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-deep text-[11px] font-display font-semibold text-fg2"
      >
        {letter}
      </span>
      <input
        type="text"
        dir="rtl"
        value={o.labelAr}
        onChange={(e) => onChange({ labelAr: e.target.value })}
        placeholder={t('option_label_ar')}
        className="h-8 min-w-0 flex-1 rounded-md border border-border bg-bg-deep px-2 py-1 text-[13px] text-fg1 outline-none transition-colors focus:border-accent"
      />
      <input
        type="text"
        value={o.labelEn}
        onChange={(e) => onChange({ labelEn: e.target.value })}
        placeholder={t('option_label_en')}
        className="h-8 min-w-0 flex-1 rounded-md border border-border bg-bg-deep px-2 py-1 text-[13px] text-fg1 outline-none transition-colors focus:border-accent"
      />
      <label className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-fg2">
        <input
          type="radio"
          checked={o.isCorrect}
          onChange={() => onChange({ isCorrect: true })}
          className="accent-accent"
        />
        <span>{t('correct_label')}</span>
      </label>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={oIdx === 0}
          aria-label={t('move_up', { n: oIdx + 1 })}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ArrowUp className="h-3 w-3" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={oIdx === total - 1}
          aria-label={t('move_down', { n: oIdx + 1 })}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-fg3 hover:bg-bg-deep hover:text-fg1 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ArrowDown className="h-3 w-3" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={total <= 2}
          aria-label={t('remove_option')}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-accent/80 hover:bg-accent-soft hover:text-accent disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Trash2 className="h-3 w-3" aria-hidden />
        </button>
      </div>
    </div>
  )
}
