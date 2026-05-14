# Ask Dr. Khaled — Q&A intake (Phase B1) + admin queue (Phase B2)

User-facing Q&A submission + history at `/dashboard/ask`. Dr. Khaled's
team answers from the admin queue at `/admin/questions`. The doctor
writes a prose reply (`answer_body`) inside the admin modal — the asker
receives that reply by email and sees it on their dashboard. A public
URL (Instagram reel, YouTube clip, article) can be attached as an
optional supplementary link, but the prose answer is the primary
deliverable. The site is now a full Q&A surface, not intake-only.

## Phase B1 — user-facing intake

`/dashboard/ask` composes:
- Editorial hero
- Signed note from Dr. Khaled
- Sticky "Before you send" guide
- The submission form
- A history list with segmented filter pills (All / Pending / Answered / Archived)

"All" excludes ARCHIVED to keep the active queue front-and-centre.

### Form

Fields: subject + body + optional category + optional anonymity preference
(see "Dormant column" below).

Rate-limited at 5 questions per hour per user via
`tryRateLimit('user-question:${userId}', { limit: 5, window: '60 m' })`
(fails OPEN when Upstash isn't configured).

### v1 scope

Intake-only — no user-facing edit / delete / archive affordances. Admin
(Phase B2) handles status transitions.

### Visibility

Gated on the `dashboard.show_ask_tab` site-setting (default `true`).
The route still resolves via deep link when the tab is hidden — only
the sidebar entry is hidden.

### Dormant `is_anonymous` column

The `is_anonymous boolean` column on `user_questions` (migration 0009)
is preserved but unused — the user-facing toggle was removed pre-launch
and every insert writes the DB default (`false`). Reintroducing the
toggle would re-add `isAnonymous` to the validator + form + admin
table; no schema change needed.

### Categories

Stored as plain text (not a `pgEnum`) so admin can adjust the vocabulary
without a migration — the validator's tuple guard is the single source
of truth for allowed values.

## Phase B2 — admin queue

`/admin/questions` — paginated list with status filter, joined with
the `users` table for user name + email. Admin actions:
- Mark answered (with **required** prose body + optional URL)
- Archive
- Revert (back to PENDING — clears both body and URL)
- Delete (idempotent hard delete)

### Answer model

Two fields on `user_questions`:
- `answer_body` (TEXT, nullable) — the prose reply Dr. Khaled writes in
  the admin modal. Required to reach `ANSWERED`. Validator floor 10
  chars, cap 4000. Plain text; paragraphs separated by blank lines.
- `answer_reference` (TEXT, nullable) — optional supplementary URL
  (Instagram reel, YouTube clip, article). Becomes a CTA button in the
  notification email when set; rendered as a "View the full answer"
  link on the asker's dashboard.

### Email notification semantics

The answered-notification email (`question-answered.ts` template,
sent via `sendAnsweredNotificationEmail` in `lib/email/send.ts`) fires
on PENDING → ANSWERED transition, always carrying the prose answer body.
The optional URL becomes an extra CTA block inside the email; without
it, the email renders prose-only.

Non-PENDING source states (e.g., editing an already-ANSWERED row's
answer) skip the email so admins aren't surprised by re-sends.

Email send NEVER blocks the status update — Resend missing/down maps
to a warning toast; the DB write still succeeds.

### User locale fallback

The `users` table has no `locale` column, so the answered-notification
email defaults to `'ar'` (the site's primary locale). Adding
`users.locale` is a Phase B3 concern.

### Sidebar entry

Sits in the Audience group with a pending-count badge powered by
`getPendingQuestionCount()` in the admin layout. Always visible —
the previous `admin.show_admin_questions` visibility toggle was
removed (hiding admin sections from the admin made no sense). The
layout passes `pendingQuestionCount` to both `AdminSidebar` and
`AdminTopbar` for the badge only.

## Schema

`user_questions` table (migration `0009_user_questions.sql`):
- Indexes: `(user_id, created_at DESC)` and `(status, created_at DESC)`
- Enum: `questionStatus` (PENDING / ANSWERED / ARCHIVED)

## Files

### Phase B1 (intake)
- `app/[locale]/(dashboard)/dashboard/ask/{page,actions}.{tsx,ts}`
- `components/dashboard/ask/{AskDrKhaledPage,AskHero,AskGuide,QuestionForm,QuestionList,QuestionCard,AskEmptyState,SubmitSuccessCard}.tsx`
- `lib/validators/user-question.ts` — `createUserQuestionSchema`,
  `QUESTION_CATEGORIES`, length constants
- `lib/db/queries.ts` — `getUserQuestionsByUserId`, `createUserQuestion`

### Phase B2 (admin)
- `app/[locale]/(admin)/admin/questions/{page,actions}.{tsx,ts}`
- `components/admin/questions/{AdminQuestionsPage,QuestionsTable,MarkAnsweredModal,ArchiveModal,RevertModal,DeleteModal}.tsx`
- `lib/email/templates/question-answered.ts`
- `lib/email/send.ts` — `sendAnsweredNotificationEmail`
- `lib/validators/user-question.ts` — `updateQuestionStatusSchema`
  (refines that ANSWERED requires a non-empty answerReference),
  `deleteQuestionSchema`, `adminQuestionListSchema`
- `lib/db/queries.ts` — `getAdminQuestions`, `getQuestionById`,
  `updateQuestionStatus` (atomic timestamp side-effects per status),
  `deleteQuestion`, `getPendingQuestionCount`

### i18n
- `messages/{ar,en}.json` — `dashboard.ask.*`, `admin.questions.*`,
  `email.question_answered.*`
